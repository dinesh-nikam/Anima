import { HttpException, HttpStatus } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Domain-specific rendering exceptions. Stable error codes for API consumers.
// ---------------------------------------------------------------------------

export class TemplateNotFoundException extends HttpException {
  constructor(templateId: string) {
    super(
      {
        code: 'README_TEMPLATE_NOT_FOUND',
        message: 'Template not found',
        templateId,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ThemeNotFoundException extends HttpException {
  constructor(themeId: string) {
    super(
      {
        code: 'README_THEME_NOT_FOUND',
        message: 'Theme not found',
        themeId,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ComponentNotFoundException extends HttpException {
  constructor(componentId: string) {
    super(
      {
        code: 'README_COMPONENT_NOT_FOUND',
        message: 'Component not found',
        componentId,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidComponentConfigurationException extends HttpException {
  constructor(componentId: string, details: unknown) {
    super(
      {
        code: 'README_INVALID_COMPONENT_CONFIGURATION',
        message: 'Invalid component configuration',
        componentId,
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class UnsupportedComponentException extends HttpException {
  constructor(componentId: string) {
    super(
      {
        code: 'README_UNSUPPORTED_COMPONENT',
        message: 'Component is not supported or disabled',
        componentId,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ProviderConfigurationException extends HttpException {
  constructor(providerKey: string, message: string) {
    super(
      {
        code: 'README_PROVIDER_CONFIGURATION_ERROR',
        message,
        providerKey,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class UnsafeUrlException extends HttpException {
  constructor(url: string, reason: string) {
    super(
      {
        code: 'README_UNSAFE_URL',
        message: 'URL failed safety validation',
        reason,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidMarkdownException extends HttpException {
  constructor(reason: string) {
    super(
      {
        code: 'README_INVALID_MARKDOWN',
        message: 'Markdown content failed validation',
        reason,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class RenderFailureException extends HttpException {
  constructor(reason: string) {
    super(
      {
        code: 'README_RENDER_FAILURE',
        message: 'Rendering failed',
        reason,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
