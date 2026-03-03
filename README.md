# Universal Video Source Finder (Chrome Extension - Manifest V3)

إضافة Chrome لفحص **أي موقع** (ومنها `program.mmgmena.com`) لاكتشاف مصادر الفيديو الظاهرة مثل:
- MP4
- M3U8 (HLS)
- Blob URLs

## الوظائف
1. **Scan for Videos** لفحص الصفحة النشطة.
2. **Download** للروابط المباشرة (MP4/WebM/MOV).
3. **Save Blob** لتنزيل روابط `blob:` من سياق الصفحة.
4. **Copy FFmpeg** لنسخ أمر تحويل `m3u8` إلى `mp4`.

## أمر FFmpeg المقترح
```bash
ffmpeg -i "<M3U8_URL>" -c copy "output.mp4"
```

## ملاحظات مهمة
- هذه الإضافة تعمل فقط على الروابط الظاهرة/المتاحة داخل الصفحة.
- إذا كان الفيديو محميًا بـ DRM أو مفاتيح/جلسات خاصة، قد لا ينجح التنزيل.

## التثبيت اليدوي
1. افتح `chrome://extensions`.
2. فعّل **Developer mode**.
3. اضغط **Load unpacked**.
4. اختر مجلد المشروع.

## الصلاحيات
- `activeTab`
- `storage`
- `declarativeNetRequest`
- `downloads`
- `host_permissions: <all_urls>`

## استخدام قانوني
استخدمها فقط للمحتوى الذي لديك حق الوصول والتنزيل له.
