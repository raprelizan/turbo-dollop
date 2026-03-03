# Universal Video Source Finder (Chrome Extension - Manifest V3)

إضافة Chrome لفحص **أي موقع** (ومنها `program.mmgmena.com`) واستخراج مصادر الفيديو الظاهرة، ثم محاولة تنزيلها مباشرة كـ **MP4**.

## حل مشكلة الخطأ: `TypeError: Failed to fetch`
تمت إضافة آلية retry متعددة لمحاولات الجلب (`credentials include/omit` + أنماط fetch مختلفة) وتحسين رسائل الخطأ.

- لو فشل التحويل/الجلب لروابط **MP4/Blob**، الإضافة تعمل **fallback** إلى تنزيل مباشر عبر `chrome.downloads.download`.
- لو فشل **M3U8**، يتم إظهار سبب أقرب للواقع (مثل قيود CORS/جلسة/TS-based playlist).

## ماذا يحدث عند الضغط على Download MP4؟
1. **MP4 / Blob**: محاولة جلب ثم حفظ كـ `.mp4`.
2. **M3U8**:
   - إذا كان البث من نوع **fMP4** (مثل `init.mp4` + `m4s`) تحاول الإضافة تجميعه كـ MP4.
   - إذا كان TS-based أو محميًا فقد لا ينجح داخل المتصفح.

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
استخدم الإضافة فقط للمحتوى الذي لديك حق الوصول والتنزيل له.
