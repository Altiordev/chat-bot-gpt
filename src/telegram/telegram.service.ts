import { InjectBot } from "@grammyjs/nestjs";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { Bot, Context } from "grammy";
import { AiService } from "src/services/ai.service";

@Injectable()
export class TelegramService {
  private readonly botToken: string;

  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
  ) {
    this.botToken = configService.get<string>("TELEGRAM_BOT_TOKEN");
  }

  async processTextMessage(ctx: Context) {
    const text = ctx.msg.text;

    if (!text) {
      await ctx.reply("⚠️ Bo'sh xabar. Iltimos, matn yuboring.");
      return;
    }

    console.log(text);

    try {
      await ctx.api.sendChatAction(ctx.chat.id, "typing");

      const { response } = await this.aiService.generateChatResponse(text);

      console.log(response);

      await ctx.reply(response);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Matnli xabarni qayta ishlashda xatolik:", {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        console.error("Noma'lum xatolik:", error);
      }
      await ctx.reply("⚠️ Matnli xabarni qayta ishlashda xatolik.");
    }
  }
}
