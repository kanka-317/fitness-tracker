import { readFile } from 'node:fs/promises';
import type { Context } from 'koa';
import { analyzeFoodImage } from '../services/gemini';

type UploadedFile = {
  filepath?: string;
  mimetype?: string;
  type?: string;
  size?: number;
};

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
const SUPPORTED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const getUploadedImage = (ctx: Context) => {
  const uploadedFile = (ctx.request as any).files?.image;

  if (Array.isArray(uploadedFile)) {
    return uploadedFile[0] as UploadedFile | undefined;
  }

  return uploadedFile as UploadedFile | undefined;
};

export default {
  async analyze(ctx: Context) {
    const file = getUploadedImage(ctx);

    if (!file) {
      return ctx.badRequest('No image uploaded.');
    }

    const filePath = typeof file.filepath === 'string' ? file.filepath : '';
    const mimeType =
      typeof file.mimetype === 'string'
        ? file.mimetype
        : typeof file.type === 'string'
          ? file.type
          : '';

    if (!filePath || !mimeType) {
      return ctx.badRequest('The uploaded image could not be read.');
    }

    if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
      return ctx.badRequest('Upload a JPG, PNG, or WEBP image.');
    }

    if (typeof file.size === 'number' && file.size > MAX_IMAGE_SIZE_BYTES) {
      return ctx.badRequest('Use an image smaller than 4 MB.');
    }

    try {
      const imageBuffer = await readFile(filePath);

      if (!imageBuffer.byteLength) {
        return ctx.badRequest('The uploaded image could not be read.');
      }

      if (imageBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
        return ctx.badRequest('Use an image smaller than 4 MB.');
      }

      const result = await analyzeFoodImage({
        imageBase64: imageBuffer.toString('base64'),
        mimeType,
      });

      ctx.body = {
        data: {
          result,
        },
      };
    } catch (error) {
      (global as any).strapi?.log?.error?.('Gemini food image analysis failed.', error);

      return ctx.internalServerError(
        error instanceof Error
          ? error.message
          : 'Food image analysis failed.',
      );
    }
  },
};
