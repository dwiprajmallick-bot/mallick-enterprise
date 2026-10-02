import fs from "fs";
import path from "path";

const targetDir = "public";

if (fs.existsSync(targetDir)) {
  const files = fs.readdirSync(targetDir);

  for (const file of files) {
    if (file.endsWith(".html") || file.endsWith(".js")) {
      const filePath = path.join(targetDir, file);
      let content = fs.readFileSync(filePath, "utf8");

      let updated = false;

      // ডেমো UPI আইডি ও টেক্সট প্রতিস্থাপন
      if (content.includes("officekart@upi")) {
        content = content.replaceAll("officekart@upi", "dwiprajmallick@pnb");
        updated = true;
      }
      if (content.includes("Scan with any UPI App to Pay")) {
        content = content.replaceAll("Scan with any UPI App to Pay", "পাঞ্জাব ন্যাশনাল ব্যাংক (PNB) অফিসিয়াল QR");
        updated = true;
      }
      if (content.includes("api.qrserver.com")) {
        content = content.replace(/https:\/\/api\.qrserver\.com\/[^\s"'\`]+/g, "/pnb-qr.jpg");
        updated = true;
      }

      if (updated) {
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`✅ আপডেট সম্পন্ন: ${file}`);
      }
    }
  }
}
console.log("🎉 সকল ফাইল সফলভাবে PNB QR দিয়ে ক্লিন করা হয়েছে!");
