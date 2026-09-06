import { Injectable, Logger } from '@nestjs/common';
import * as zlib from 'zlib';

export interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
  hasChanges: boolean;
}

@Injectable()
export class GifOptimizerService {
  private readonly logger = new Logger(GifOptimizerService.name);

  /**
   * Computes the minimal bounding sub-rectangle containing pixels that changed between two frames.
   * Enables dirty-rectangle sub-frame encoding to minimize GIF byte size.
   */
  computeDirtyRect(
    currFrameRgba: Uint8Array | Buffer,
    prevFrameRgba: Uint8Array | Buffer | null,
    width: number,
    height: number,
    alphaThreshold = 128,
  ): DirtyRect {
    if (!prevFrameRgba || prevFrameRgba.length !== currFrameRgba.length) {
      return { x: 0, y: 0, width, height, hasChanges: true };
    }

    let minX = width;
    let maxX = -1;
    let minY = height;
    let maxY = -1;
    let changedCount = 0;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x * 4;

        const currR = currFrameRgba[idx];
        const currG = currFrameRgba[idx + 1];
        const currB = currFrameRgba[idx + 2];
        const currA = currFrameRgba[idx + 3];

        const prevR = prevFrameRgba[idx];
        const prevG = prevFrameRgba[idx + 1];
        const prevB = prevFrameRgba[idx + 2];
        const prevA = prevFrameRgba[idx + 3];

        // Check color or alpha delta
        const isDifferent =
          currA !== prevA ||
          (currA >= alphaThreshold &&
            (Math.abs(currR - prevR) > 2 ||
              Math.abs(currG - prevG) > 2 ||
              Math.abs(currB - prevB) > 2));

        if (isDifferent) {
          changedCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (changedCount === 0) {
      return { x: 0, y: 0, width: 1, height: 1, hasChanges: false };
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      hasChanges: true,
    };
  }

  /**
   * Applies lossy LZW color clamping to merge near-identical colors into exact matches.
   * Maximizes LZW compression run-length without perceptible visual degradation.
   */
  applyLossyColorClamping(
    rgbaData: Uint8Array | Buffer,
    threshold = 12,
  ): Uint8Array {
    if (threshold <= 0) return new Uint8Array(rgbaData);

    const len = rgbaData.length;
    const result = new Uint8Array(len);
    result.set(rgbaData);

    const quantStep = Math.max(1, Math.round(threshold));

    for (let i = 0; i < len; i += 4) {
      const a = result[i + 3];
      if (a < 128) continue;

      result[i] = Math.round(result[i] / quantStep) * quantStep;
      result[i + 1] = Math.round(result[i + 1] / quantStep) * quantStep;
      result[i + 2] = Math.round(result[i + 2] / quantStep) * quantStep;
    }

    return result;
  }

  /**
   * Encodes sequence of RGBA frames into an Animated PNG (APNG) binary stream with full 32-bit alpha.
   */
  encodeApng(
    framesRgba: (Uint8Array | Buffer)[],
    width: number,
    height: number,
    fps: number,
  ): Buffer {
    const numFrames = framesRgba.length;
    const delayNum = 1;
    const delayDen = Math.max(1, Math.round(fps));

    const chunks: Buffer[] = [];

    // 1. PNG Signature
    chunks.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    // 2. IHDR Chunk (Width, Height, 8-bit depth, RGBA color type 6)
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // Bit depth
    ihdrData[9] = 6; // Color type RGBA
    ihdrData[10] = 0; // Compression
    ihdrData[11] = 0; // Filter
    ihdrData[12] = 0; // Interlace
    chunks.push(this.makeChunk('IHDR', ihdrData));

    // 3. acTL Chunk (Animation Control)
    const actlData = Buffer.alloc(8);
    actlData.writeUInt32BE(numFrames, 0);
    actlData.writeUInt32BE(0, 4); // 0 = infinite loop
    chunks.push(this.makeChunk('acTL', actlData));

    let sequenceNumber = 0;

    // 4. Encode Each Frame with fcTL & fdAT/IDAT
    for (let f = 0; f < numFrames; f++) {
      // Frame Control Chunk fcTL
      const fctlData = Buffer.alloc(26);
      fctlData.writeUInt32BE(sequenceNumber++, 0);
      fctlData.writeUInt32BE(width, 4);
      fctlData.writeUInt32BE(height, 8);
      fctlData.writeUInt32BE(0, 12); // x_offset
      fctlData.writeUInt32BE(0, 16); // y_offset
      fctlData.writeUInt16BE(delayNum, 20);
      fctlData.writeUInt16BE(delayDen, 22);
      fctlData[24] = 0; // dispose_op: none
      fctlData[25] = 0; // blend_op: source
      chunks.push(this.makeChunk('fcTL', fctlData));

      // Filter raw RGBA lines (Filter 0: None)
      const rawScanlines = Buffer.alloc(height * (1 + width * 4));
      const frameBuffer = framesRgba[f];

      for (let y = 0; y < height; y++) {
        const destOffset = y * (1 + width * 4);
        rawScanlines[destOffset] = 0; // Filter 0
        const srcOffset = y * width * 4;
        const buf = Buffer.isBuffer(frameBuffer)
          ? frameBuffer
          : Buffer.from(frameBuffer.buffer, frameBuffer.byteOffset, frameBuffer.byteLength);
        buf.copy(
          rawScanlines,
          destOffset + 1,
          srcOffset,
          srcOffset + width * 4,
        );
      }

      const compressed = zlib.deflateSync(rawScanlines);

      if (f === 0) {
        // First frame uses standard IDAT chunk
        chunks.push(this.makeChunk('IDAT', compressed));
      } else {
        // Subsequent frames use fdAT chunk with sequence number prefix
        const fdatData = Buffer.alloc(4 + compressed.length);
        fdatData.writeUInt32BE(sequenceNumber++, 0);
        compressed.copy(fdatData, 4);
        chunks.push(this.makeChunk('fdAT', fdatData));
      }
    }

    // 5. IEND Chunk
    chunks.push(this.makeChunk('IEND', Buffer.alloc(0)));

    return Buffer.concat(chunks);
  }

  private makeChunk(type: string, data: Buffer): Buffer {
    const len = data.length;
    const chunk = Buffer.alloc(4 + 4 + len + 4);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);

    // Compute CRC32 over type + data
    const crcVal = this.crc32(chunk.subarray(4, 8 + len));
    chunk.writeUInt32BE(crcVal, 8 + len);

    return chunk;
  }

  private crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        if ((crc & 1) !== 0) {
          crc = (crc >>> 1) ^ 0xedb88320;
        } else {
          crc = crc >>> 1;
        }
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
}
