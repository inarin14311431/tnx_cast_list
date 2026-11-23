# サードパーティライセンス / Third-Party Licenses

このリポジトリが同梱している第三者のソフトウェアと、そのライセンス本文です。いずれも MIT License です。
MIT License の条件(著作権表示とライセンス本文を、ソフトウェアの全部または相当部分に付ける)を満たすため、ここに本文を載せています。

## 同梱しているもの

| ファイル | 内容 |
|---|---|
| `js/vendor/supabase-js.js` | 下の表のパッケージを1つにまとめた(bundle した)もの |

| パッケージ | バージョン | 著作権者 | ライセンス | 本文 |
|---|---|---|---|---|
| `@supabase/supabase-js` | 2.112.0 | Copyright (c) 2020 Supabase | MIT | [1](#1-supabase) |
| `@supabase/auth-js` | 2.112.0 | Copyright (c) 2020 Supabase | MIT | [1](#1-supabase) |
| `@supabase/postgrest-js` | 2.112.0 | Copyright (c) 2020 Supabase | MIT | [1](#1-supabase) |
| `@supabase/storage-js` | 2.112.0 | Copyright (c) 2020 Supabase | MIT | [1](#1-supabase) |
| `@supabase/functions-js` | 2.112.0 | Copyright (c) 2020 Supabase | MIT | [1](#1-supabase) |
| `@supabase/realtime-js` | 2.112.0 | Copyright (c) 2020 Supabase | MIT | [1](#1-supabase) |
| `@supabase/phoenix` | 0.4.5 | Copyright (c) 2014 Chris McCord | MIT | [2](#2-supabasephoenix) |
| `iceberg-js` | 0.8.1 | Copyright (c) 2025 Supabase | MIT | [3](#3-iceberg-js) |

著作権者・年・バージョンは、npm の各パッケージ(`node_modules` 内の `package.json` と `LICENSE`)の実物と照合したものです。
`js/vendor/supabase-js.js` の冒頭コメントの記載とも一致しています。`@supabase/supabase-js` と、同梱の5パッケージ
(auth-js・postgrest-js・storage-js・functions-js・realtime-js)の `LICENSE` は、同じ文面です。

## 1. Supabase

対象: `@supabase/supabase-js`、`@supabase/auth-js`、`@supabase/postgrest-js`、`@supabase/storage-js`、`@supabase/functions-js`、`@supabase/realtime-js`(すべて 2.112.0)

```text
MIT License

Copyright (c) 2020 Supabase

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 2. @supabase/phoenix

対象: `@supabase/phoenix` 0.4.5

```text
# MIT License

Copyright (c) 2014 Chris McCord

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## 3. iceberg-js

対象: `iceberg-js` 0.8.1

```text
MIT License

Copyright (c) 2025 Supabase

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
