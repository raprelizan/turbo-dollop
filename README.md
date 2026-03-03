# Circle Video Finder (Chrome Extension - Manifest V3)

إضافة Chrome لفحص صفحات Circle.so واكتشاف روابط الفيديو الظاهرة مثل:
- MP4
- M3U8 (HLS)
- Blob URLs

## ما الذي تفعله الإضافة؟
1. **Scan for Videos**: تفحص الصفحة الحالية وتعرض مصادر الفيديو المكتشفة.
2. **MP4/WebM/MOV**: تنزيل مباشر عبر Chrome Downloads API.
3. **Blob**: إرسال طلب للـ content script ليجلب الـ blob من سياق الصفحة ثم تنزيله بامتداد MP4.
4. **M3U8**: نسخ أمر `ffmpeg` جاهز لتحويل البث إلى `output.mp4`.

## تحويل m3u8 إلى mp4
عند اكتشاف رابط m3u8، انسخ الأمر المقترح وشغّله:

```bash
ffmpeg -i "<M3U8_URL>" -c copy "output.mp4"
```

> ملاحظة: إذا كان البث محميًا بـ DRM أو يتطلب جلسة مصادقة خاصة، قد لا تنجح عملية التحويل/التنزيل.

## التثبيت اليدوي (Developer Mode)
1. افتح Chrome واذهب إلى `chrome://extensions`.
2. فعّل **Developer mode**.
3. اضغط **Load unpacked**.
4. اختر هذا المجلد.
5. افتح صفحة ضمن `*.circle.so` ثم افتح الإضافة واضغط **Scan for Videos**.

## الصلاحيات
- `activeTab`: الوصول للتبويب النشط.
- `storage`: حفظ نتائج آخر فحص.
- `declarativeNetRequest`: مضافة حسب المتطلب.
- `downloads`: تنزيل الملفات المكتشفة.
- `host_permissions`: على `*://*.circle.so/*`.

## تنبيه قانوني
استخدم الإضافة فقط للمحتوى الذي لديك الحق في تنزيله، ووفق شروط الخدمة والقوانين المحلية.
