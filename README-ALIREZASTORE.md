# AlirezaStore - نسخه با هویت بصری لوکس

این نسخه بر پایه پروژه Bazarino آماده شده و ظاهر آن به برند AlirezaStore با تم مشکی/طلایی تغییر یافته است.

## اجرا در ویندوز و VS Code
1. فایل ZIP را استخراج کنید.
2. پوشه `bazarino` را در VS Code باز کنید.
3. Node.js را نصب داشته باشید.
4. در ترمینال ریشه پروژه اجرا کنید:
   `npm run install:all`
5. برای اجرای هم‌زمان فرانت‌اند و بک‌اند:
   `npm run dev`
6. آدرس فرانت‌اند در ترمینال نمایش داده می‌شود (معمولاً `http://localhost:5173`).

## تغییرات این نسخه
- نام و هویت برند به AlirezaStore تغییر کرده است.
- لوگوی اختصاصی SVG مشکی/طلایی اضافه شده است.
- رنگ‌بندی صفحات به تم لوکس مشکی و طلایی تغییر کرده است.
- برای آگهی‌هایی که تصویر اختصاصی ندارند، تصویر جایگزین متناسب با دسته‌بندی نمایش داده می‌شود؛ تصاویر آپلودی کاربران همچنان اولویت دارند.
- عنوان صفحه و favicon به برند جدید تغییر کرده است.

نکته: تصاویر جایگزین از Unsplash بارگذاری می‌شوند و برای نمایش آن‌ها اینترنت لازم است. برای آگهی‌های واقعی بهتر است فروشنده تصویر خود کالا را بارگذاری کند.

## Updates in this delivery
- Added a Persian/English language switch in the header. The selected language is saved in localStorage and updates the document language and text direction.
- Added a dark/light appearance switch. The selected appearance is saved in localStorage.
- Added English translations for the header and main marketplace landing-page labels/categories.

## Verification status
The source archive was updated, but a production build could not be verified in this environment: frontend dependencies are not installed and two npm install attempts timed out. Run `npm install` in `client` (or `npm run install:all` from the project root) on a machine with npm registry access, then run `npm run build` from the project root. Backend/API integration and browser interaction tests have not been run here. English translations currently cover the header and main landing page; some secondary forms and detail/admin screens still contain Persian text and need full translation before claiming complete bilingual coverage.
