import { InjectBot } from "@grammyjs/nestjs";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { Api, Bot, Context } from "grammy";
import { AiService } from "src/services/ai.service";
import { SpeechService } from "src/services/speech.service";

@Injectable()
export class TelegramService {
  private readonly botToken: string;

  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly configService: ConfigService,
    private readonly speechService: SpeechService,
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
      const typingStatus = await ctx.api.sendChatAction(ctx.chat.id, "typing");

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

  async processVoiceMessage(ctx: Context) {
    const voice = ctx.msg.voice;
    const duration = voice.duration;

    let progressMessageId: number | undefined;
    let interval: NodeJS.Timeout | undefined;
    let percent = 10;

    try {
      const file = await ctx.getFile();
      await ctx.reply(`🎤 Ovozli xabar uzunligi: ${duration} soniya.`);

      const progressMsg = await ctx.reply(this.renderProgress(percent));
      progressMessageId = progressMsg.message_id;

      interval = setInterval(
        async () => {
          if (percent < 90) {
            percent += 5;
            await this.updateProgress(
              ctx.api,
              ctx.chat.id,
              progressMessageId,
              percent,
            );
          }
        },
        duration > 300 ? 3000 : 2000,
      );

      const transcription = await this.speechService.transcribeVoice(
        file.file_path,
      );

      const { cost, timestamps } = await this.aiService.generateTimestamps(
        transcription,
        duration,
      );

      clearInterval(interval);
      await this.updateProgress(ctx.api, ctx.chat.id, progressMessageId, 100);

      await ctx.reply(`⏳ Vaqt kodlari:\n\n${timestamps}`);
      await ctx.reply(cost);
    } catch (error) {
      clearInterval(interval);
      if (axios.isAxiosError(error)) {
        console.error("Ovozli xabarni qayta ishlashda xatolik:", {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        console.error("Noma'lum xatolik:", error);
      }
      await ctx.reply("⚠️ Ovozli xabarni qayta ishlashda xatolik.");
    }
  }

  private async updateProgress(
    api: Api,
    chatId: number,
    messageId: number,
    percent: number,
  ) {
    await api.editMessageText(chatId, messageId, this.renderProgress(percent));
  }

  private renderProgress(percent: number): string {
    const totalBlocks = 10;
    const filledBlockChar = "▒";
    const emptyBlockChar = "░";

    const filledBlocks = Math.max(1, Math.round((percent / 100) * totalBlocks));
    const emptyBlocks = totalBlocks - filledBlocks;

    // 🔄 Jarayon: [▒▒▒▒░░░░░░] 40%
    return `🔄 Jarayon: [${filledBlockChar.repeat(filledBlocks)}${emptyBlockChar.repeat(emptyBlocks)}] ${percent}%`;
  }
}
