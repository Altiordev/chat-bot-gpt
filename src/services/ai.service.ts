import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { OPENAI_API } from "src/constants";
import {
  buildTimestampUserPrompt,
  TIMESTAMP_SYSTEM_PROMPT,
} from "src/prompts/timestamp.prompts";

interface IOpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

@Injectable()
export class AiService {
  private readonly openaiApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>("OPENAI_API_KEY");
  }

  async generateChatResponse(userMessage: string): Promise<{
    response: string;
    cost: string;
  }> {
    // Using the most cost-effective model for text responses
    // const model = "gpt-3.5-turbo";
    const model = "gpt-4o-mini";

    const response = await axios.post<IOpenAIResponse>(
      `${OPENAI_API}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: "system",
            content:
              "Siz aniq va qisqa ma'lumot beradigan foydali yordamchisiz. Foydalanuvchiga o'zbek tilida javob bering.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
      },
    );

    const result = response.data.choices[0].message.content;
    const usage = response.data.usage;

    // Calculate cost based on GPT-3.5-Turbo pricing
    const inputCost = (usage.prompt_tokens / 1000) * 0.0015;
    const outputCost = (usage.completion_tokens / 1000) * 0.002;
    const total = inputCost + outputCost;

    const costText = `💸 Generatsiya narxi: ~\$${total.toFixed(6)}`;

    return {
      response: result,
      cost: costText,
    };
  }

  async generateTimestamps(
    text: string,
    audioDurationSec: number,
  ): Promise<{
    timestamps: string;
    cost: string;
  }> {
    // Maksimal mantiqiy segmentlar
    const maxSegments = 10;

    // Matnni so'zlarga bo'lamiz
    const words = text.split(/\s+/);

    const wordsPerSegment = Math.ceil(words.length / maxSegments);
    const secondsPerSegment = Math.floor(audioDurationSec / maxSegments);

    const segments: { time: string; content: string }[] = [];

    for (let i = 0; i < maxSegments; i++) {
      // Segment boshlanish vaqtini hisoblaymiz
      const fromSec = i * secondsPerSegment;
      // Soniyalarni mm:ss formatiga o'zgartiramiz
      const fromMin = String(Math.floor(fromSec / 60)).padStart(2, "0");
      const fromSecRest = String(fromSec % 60).padStart(2, "0");
      const time = `${fromMin}:${fromSecRest}`;

      // Segment boshi va oxiri indekslarini hisoblaymiz
      const start = i * wordsPerSegment;
      const end = start + wordsPerSegment;
      const content = words.slice(start, end).join(" ");

      if (content.trim()) {
        // Segmentni massivga qo'shamiz
        segments.push({ time, content });
      }
    }

    const preparedText = segments.map(({ content }) => content).join("\n");

    const systemMessage = TIMESTAMP_SYSTEM_PROMPT;
    const userMessage = buildTimestampUserPrompt(preparedText);

    const response = await axios.post<IOpenAIResponse>(
      `${OPENAI_API}/chat/completions`,
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.3, // Насколько "свободно" думает модель (0 — строго, 1 — креативно)
        max_tokens: 300, // Ограничиваем объём ответа
      },
      {
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
      },
    );

    const result = response.data.choices[0].message.content;
    const usage = response.data.usage;

    const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
    const outputCost = (usage.completion_tokens / 1_000_000) * 0.6;
    const total = inputCost + outputCost;

    const costText = `💸 Generatsiya narxi: ~\$${total.toFixed(4)}`;

    return {
      timestamps: result,
      cost: costText,
    };
  }
}
