import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { OPENAI_API } from "src/constants";
import { CHAT_SYSTEM_PROMPT } from "../prompts/timestamp.prompts";

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
    // const model = "gpt-3.5-turbo";
    const model = "gpt-4o-mini";

    const response = await axios.post<IOpenAIResponse>(
      `${OPENAI_API}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: "system",
            content: CHAT_SYSTEM_PROMPT,
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

    const inputCost = (usage.prompt_tokens / 1000) * 0.0015;
    const outputCost = (usage.completion_tokens / 1000) * 0.002;
    const total = inputCost + outputCost;

    const costText = `💸 Generatsiya narxi: ~\$${total.toFixed(6)}`;

    return {
      response: result,
      cost: costText,
    };
  }
}
