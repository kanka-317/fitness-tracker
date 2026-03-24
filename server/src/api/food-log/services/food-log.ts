/**
 * food-log service
 */

import { factories } from '@strapi/strapi';
import { analyzeFoodImage } from '../../image-analysis/services/gemini';

export default factories.createCoreService('api::food-log.food-log', () => ({
  async analyzeImage({
    imageBase64,
    mimeType,
  }: {
    imageBase64: string;
    mimeType: string;
  }) {
    return analyzeFoodImage({ imageBase64, mimeType });
  },
}));
