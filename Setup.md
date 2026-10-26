# EazeTuition 本机启动指南（Windows）

本文适用于第一次从 GitHub 下载项目的新电脑。项目包含 Flask 后端、MySQL 数据库和 Expo 手机 App。推荐先启动后端，再启动手机 App。

> 仓库应保持为 Private。数据库导出含有测试账号资料；请勿公开仓库，也不要把自己的 `.env`、密码、邮件密钥或用户上传文件提交到 Git。

## 1. 安装必需软件

安装以下工具：

- Git for Windows
- Python 3.11（安装时勾选 Add Python to PATH）
- Node.js LTS（安装包会包含 npm）
- MySQL 8 / MySQL Installer，以及 MySQL Workbench
- Android 手机安装 Expo Go，或安装 Android Studio 及 Android Emulator

Windows PowerShell 可能禁止执行 `npm.ps1`。本文使用 `npm.cmd`，不需要更改 PowerShell 执行策略。

## 2. 从 GitHub 下载项目

打开 PowerShell，运行：

```powershell
cd $HOME\Downloads
git clone https://github.com/kengloons-oss/eazetuition-local-setup.git
cd eazetuition-local-setup
```

如果 GitHub 仓库名称不同，请把 clone URL 换成仓库页面里的 HTTPS URL。Private 仓库需要先用有权限的 GitHub 帐号登录 Git Credential Manager。

## 3. 建立本机数据库

1. 打开 MySQL Workbench，连接本机 MySQL Server。
2. 先确认目标库里没有要保留的数据。导入文件含表结构和演示/测试资料；不要导入已有的正式数据库。
3. 在 Workbench 选择 **Server → Data Import → Import from Self-Contained File**。
4. 选择项目根目录里的 `tuition_fyp.sql`。在 **Default Target Schema** 创建或选择 `tuition_fyp`，然后开始导入。
5. 导入完成后刷新 Schemas，确认 `tuition_fyp` 下有 tables。

也可以用 MySQL 命令行。下面的例子假设 `mysql.exe` 已加入 PATH：

```powershell
mysql -u root -p -e "CREATE DATABASE tuition_fyp CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
Get-Content .\tuition_fyp.sql | mysql -u root -p tuition_fyp
```

如果 `tuition_fyp` 已存在且里面有重要资料，先备份；不要对有资料的库重复导入此 dump。

## 4. 配置并启动 Flask 后端

在项目根目录创建本机专用环境文件：

```powershell
Copy-Item .env.example .env
notepad .env
```

在 `.env` 中将 `DATABASE_URI` 改成此电脑的 MySQL 帐号和密码，例如：

```dotenv
DATABASE_URI=mysql+mysqlconnector://root:你的MySQL密码@localhost:3306/tuition_fyp
SECRET_KEY=请换成一段随机长字符串
```

不要把真实密码写进 README、源码或聊天记录。其余 Stripe、OpenAI 和邮件变量可以先留空；付款、AI 批改、忘记密码邮件等集成功能需要各自的密钥或帐号设置。

创建 Python 环境并安装后端依赖：

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

导入数据库后，建议补上本地演示资料（脚本可以重复运行，不会删除现有资料）：

```powershell
.\.venv\Scripts\python.exe scripts\seed_demo_app_data.py
```

启动后端：

```powershell
.\.venv\Scripts\python.exe app.py
```

浏览器打开 [http://127.0.0.1:5000](http://127.0.0.1:5000)。后端会监听 `0.0.0.0:5000`，供同一 Wi-Fi 的手机连接。不要关闭这个 PowerShell 窗口；按 `Ctrl+C` 停止。

### 作业图片/PDF 识别（可选）

`pytesseract` Python 套件还需要另外安装 Tesseract OCR 程序。若使用 OCR，在 Windows 安装 Tesseract，并确认程序路径与 `controllers/homework_controller.py` 中设置的一致；否则普通 API 和 App 启动不需要 OCR。

## 5. 配置并启动 Expo 手机 App

打开**第二个** PowerShell 窗口：

```powershell
cd $HOME\Downloads\eazetuition-local-setup\EazeTuition
npm.cmd ci
```

设置手机连接后端的地址。电脑上执行 `ipconfig`，找正在使用的 Wi-Fi IPv4 地址（例如 `192.168.1.20`），然后在同一个窗口运行：

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://192.168.1.20:5000"
npm.cmd run dev -- --clear --lan
```

将示例 IP 换成自己的电脑 Wi-Fi IPv4。手机与电脑必须连接同一个 Wi-Fi；Windows 防火墙也必须允许 Python 接收本地网络的 TCP 5000 请求。可先在手机浏览器访问 `http://电脑IPv4:5000` 检查连通性。

项目使用 Expo SDK 53。手机上的 Expo Go 版本需要兼容 SDK 53；最新版 Expo Go 可能不兼容。遇到版本不兼容提示时，请使用 SDK 53 对应的 Android Expo Go 版本，或用 Android Studio 建立模拟器并按下方步骤运行原生开发版。

Expo 终端显示二维码后，用兼容的 Expo Go 扫码。启动开发服务器不需要 Expo 帐号；EAS 云端构建才需要帐号。

### Android Emulator

1. 在 Android Studio 的 SDK Manager 安装 Android SDK Platform、Platform Tools 和 Emulator；在 Device Manager 创建并启动一个虚拟设备。
2. 在 Expo 窗口把 API 地址设为 Android Emulator 专用地址：

   ```powershell
   $env:EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:5000"
   npm.cmd run dev -- --clear
   ```

3. 首次运行原生开发版时，在 `EazeTuition` 目录执行 `npm.cmd run android`。这需要 Android SDK 已安装并配置好 `ANDROID_HOME` / `ANDROID_SDK_ROOT`，且模拟器已经启动。

## 6. 日常启动顺序

每次启动时：

1. 确认 MySQL Server 正在运行。
2. 后端 PowerShell：`cd` 到项目根目录，然后运行 `.\.venv\Scripts\python.exe app.py`。
3. Expo PowerShell：`cd` 到 `EazeTuition`，设置 `EXPO_PUBLIC_API_BASE_URL`，然后运行 `npm.cmd run dev -- --lan`。
4. 打开手机 App 或模拟器。

改了电脑 IP、换了 Wi-Fi，或手机显示 Network request failed 时，重新执行步骤 3 的 API 地址设置并重启 Expo。

## 常见问题

| 问题 | 处理方式 |
| --- | --- |
| `npm.ps1 cannot be loaded` | 用 `npm.cmd ci` / `npm.cmd run dev`，不要更改系统执行策略。 |
| `No module named ...` | 从项目根目录运行 `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`。 |
| `Can't connect to MySQL` | 启动 MySQL 服务，检查 `.env` 的数据库名、帐号、密码和端口。 |
| `No database selected` | 在 Workbench 双击 `tuition_fyp` Schema，或按第 3 节重新导入。 |
| 手机 `Network request failed` | 核对手机与电脑 Wi-Fi、电脑 IPv4、后端是否运行、防火墙 TCP 5000，以及 `EXPO_PUBLIC_API_BASE_URL`。 |
| Expo Go SDK 不兼容 | 项目是 SDK 53；安装匹配版本的 Android Expo Go，或运行 Android Studio 开发版。 |
| `adb` 找不到 | 安装 Android SDK Platform Tools，并将 SDK 的 `platform-tools` 加入 PATH；重开终端后再确认 `adb version`。 |
| 忘记密码邮件或付款失败 | 在 `.env` 配置自己的 Gmail App Password / Stripe 测试密钥；普通登录和本机页面启动不依赖这些集成。 |

## 数据与密钥注意事项

- `tuition_fyp.sql` 是本项目的数据库导出，只用于本机演示/开发。请勿公开仓库或直接用于生产。
- `scripts/seed_demo_app_data.py` 追加带 `[DEMO]` 标记的课程目录和页面示例资料，可重复运行。
- `.env`、用户上传文件、个人图片和 `node_modules` 不会提交到 Git。
- Expo 的 `EXPO_PUBLIC_*` 变量会被打包进客户端，只能放可公开的配置；绝不能把 Stripe Secret Key、OpenAI Key、邮件密码放进这些变量。
