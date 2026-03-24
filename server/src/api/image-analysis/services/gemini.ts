import { GoogleGenAI } from '@google/genai';

export type FoodImageAnalysisResult = {
  isFood: boolean;
  name: string;
  calories: number;
  portionDescription: string;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
};

const FOOD_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    isFood: {
      type: 'boolean',
      description: 'True only when a visible meal or snack can be identified.',
    },
    name: {
      type: 'string',
      description: 'A concise label for the main food shown in the image.',
    },
    calories: {
      type: 'integer',
      minimum: 0,
      description: 'Estimated calories for the visible portion only.',
    },
    portionDescription: {
      type: 'string',
      description: 'Short serving estimate such as 1 bowl or 2 slices.',
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description: 'Confidence in the food and calorie estimate.',
    },
    notes: {
      type: 'string',
      description: 'One short note about assumptions or uncertainty.',
    },
  },
  required: ['isFood', 'name', 'calories', 'portionDescription', 'confidence', 'notes'],
  propertyOrdering: [
    'isFood',
    'name',
    'calories',
    'portionDescription',
    'confidence',
    'notes',
  ],
} as const;

const prompt = [
  'Analyze this uploaded image for a calorie tracking app.',
  'Return JSON only that matches the requested schema.',
  'Estimate the visible serving calories, not a generic restaurant average.',
  'Use a concise name for the main meal or snack in the image.',
  'If the image is not food or too unclear, set isFood to false, calories to 0, and explain why in notes.',
  'Keep notes short and practical.',
].join(' ');

const normalizeAnalysisResult = (value: unknown): FoodImageAnalysisResult => {
  const rawResult =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Partial<FoodImageAnalysisResult>)
      : {};
  const confidence =
    rawResult.confidence === 'low' ||
    rawResult.confidence === 'medium' ||
    rawResult.confidence === 'high'
      ? rawResult.confidence
      : 'low';
  const name =
    typeof rawResult.name === 'string' && rawResult.name.trim()
      ? rawResult.name.trim()
      : 'Unknown meal';
  const portionDescription =
    typeof rawResult.portionDescription === 'string' &&
    rawResult.portionDescription.trim()
      ? rawResult.portionDescription.trim()
      : 'Serving estimate unavailable';
  const notes =
    typeof rawResult.notes === 'string' && rawResult.notes.trim()
      ? rawResult.notes.trim()
      : 'Review this estimate before saving it to your food log.';
  const calories = Number.isFinite(rawResult.calories)
    ? Math.max(0, Math.round(Number(rawResult.calories)))
    : 0;

  return {
    isFood: Boolean(rawResult.isFood),
    name,
    calories,
    portionDescription,
    confidence,
    notes,
  };
};

export const analyzeFoodImage = async ({
  imageBase64,
  mimeType,
}: {
  imageBase64: string;
  mimeType: string;
}) => {
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

  if (!geminiApiKey) {
    throw new Error(
      'Set GEMINI_API_KEY in server/.env to enable Gemini food image analysis.',
    );
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: [
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      {
        text: prompt,
      },
    ],
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: FOOD_ANALYSIS_SCHEMA,
    },
  });

  const resultText = response.text;

  if (!resultText) {
    throw new Error('Gemini returned an empty analysis response.');
  }

  try {
    return normalizeAnalysisResult(JSON.parse(resultText));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Gemini returned a response that could not be parsed.');
    }

    throw error;
  }
};
