import { On, Start, Update } from "@grammyjs/nestjs";
import { Injectable } from "@nestjs/common";
import { Context } from "grammy";
import { TelegramService } from "./telegram.service";

@Update()
@Injectable()
export class TelegramUpdate {
  constructor(private readonly telegramService: TelegramService) {}

  @Start()
  async onStart(ctx: Context): Promise<void> {
    await ctx.reply(
      "Assalomu alaykum! 👋\n" +
        "Men sizga yordam beradigan sun’iy intellekt chatbotiman. Savollaringizga javob beraman, matnlar yozishda yoki tarjima qilishda ko‘maklashaman.\n" +
        "\n" +
        "❓ Savolingiz bormi? Shunchaki yozing!\n" +
        "\n" +
        "🧠 GPT-4 texnologiyasi asosida ishlayman — iloji boricha to‘g‘ri va foydali ma’lumot berishga harakat qilaman.\n" +
        "\n" +
        "Agar nima qilishni bilmay turgan bo‘lsangiz, quyidagilardan birini sinab ko‘ring:\n" +
        "\n" +
        '"She’r yozib ber"\n' +
        "\n" +
        '"Ingliz tilida tarjima qilib ber"\n' +
        "\n" +
        '"HTML bo‘yicha misol yoz"\n' +
        "\n" +
        '"Kurs rejasini tuzib ber"',
    );
  }

  @On("message:text")
  async onTextMessage(ctx: Context): Promise<void> {
    // Skip processing for /start command
    if (ctx.msg.text?.startsWith("/")) {
      return;
    }
    return this.telegramService.processTextMessage(ctx);
  }
}
