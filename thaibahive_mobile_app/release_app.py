import os
import re
import json
import shutil
import subprocess
import urllib.request
import urllib.error

# ─── CONFIGURATION ────────────────────────────────────────────────────────────
REPO = "media-thaiba/ThaibaHive"

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBSPEC_PATH = os.path.join(BASE_DIR, "pubspec.yaml")
ENV_PATH = os.path.join(BASE_DIR, ".env")
PARENT_ENV_PATH = os.path.join(os.path.dirname(BASE_DIR), ".env.local")

# Load environment variables
def load_env(path):
    env = {}
    if os.path.exists(path):
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    return env

local_env = load_env(ENV_PATH)
parent_env = load_env(PARENT_ENV_PATH)

GITHUB_TOKEN = local_env.get("GITHUB_TOKEN") or parent_env.get("GITHUB_TOKEN") or os.environ.get("GITHUB_TOKEN")
SYSTEM_UPDATE_SECRET = local_env.get("SYSTEM_UPDATE_SECRET") or parent_env.get("SYSTEM_UPDATE_SECRET") or os.environ.get("SYSTEM_UPDATE_SECRET") or "fallback-secret-key-123456"

# Get base api url
API_URL = local_env.get("NEXT_PUBLIC_API_URL") or parent_env.get("NEXT_PUBLIC_API_URL") or os.environ.get("NEXT_PUBLIC_API_URL") or "https://thaiba-hive.vercel.app/api"

RELEASE_NOTES = (
    "🚀 ThaibaHive — Stable Release v1.0.0\n\n"
    "• Initial release with smooth performance optimizations.\n"
    "• Resolved Hero tag transitions and navigation crashes.\n"
    "• Integrated system-wide network normalization for reliable API requests.\n"
    "• Added support for Over-The-Air (OTA) update checking."
)

# ─── 1. PARSE VERSION ─────────────────────────────────────────────────────────
if not os.path.exists(PUBSPEC_PATH):
    print(f"[ERROR] pubspec.yaml not found at {PUBSPEC_PATH}!")
    exit(1)

with open(PUBSPEC_PATH, "r") as f:
    pubspec_content = f.read()

version_match = re.search(r"^version:\s*([^\s]+)", pubspec_content, re.MULTILINE)
if not version_match:
    print("[ERROR] Could not parse version from pubspec.yaml!")
    exit(1)

raw_version = version_match.group(1)  # e.g. "1.0.0+1"
clean_version = raw_version.replace("+", "_")
tag_name = f"v{raw_version.replace('+', '-')}"

print(f"[ThaibaHive] Target Release: {tag_name}")
print(f"[ThaibaHive] Target APK Name: ThaibaHive_V{clean_version}.apk")

# ─── 2. BUILD OPTIMIZED SPLIT APK ─────────────────────────────────────────────
print("\n[ThaibaHive] Compiling optimized split APKs via Flutter...")
try:
    flutter_bin = shutil.which("flutter")
    if not flutter_bin:
        fallback_path = "D:\\flutter\\bin\\flutter.bat"
        if os.path.exists(fallback_path):
            flutter_bin = fallback_path
        else:
            print("[ERROR] Flutter executable not found in PATH or at D:\\flutter\\bin\\flutter.bat!")
            exit(1)
    
    subprocess.run([
        flutter_bin, "build", "apk", "--release", 
        "--split-per-abi", "--target-platform", "android-arm64"
    ], check=True)
except Exception as e:
    print("[ERROR] Flutter compilation failed:", e)
    exit(1)

source_apk = os.path.join(BASE_DIR, "build", "app", "outputs", "flutter-apk", "app-arm64-v8a-release.apk")
target_apk_name = f"ThaibaHive_V{clean_version}.apk"
target_apk_path = os.path.join(os.path.dirname(BASE_DIR), target_apk_name)

if not os.path.exists(source_apk):
    print(f"[ERROR] Optimized arm64 APK not found at {source_apk}!")
    exit(1)

# Copy to root directory
shutil.copyfile(source_apk, target_apk_path)
print(f"[SUCCESS] Compiled optimized APK: {target_apk_path} ({os.path.getsize(target_apk_path) / 1024 / 1024:.2f} MB)")

# ─── 3. UPLOAD TO GITHUB RELEASES ─────────────────────────────────────────────
asset_download_url = None
github_success = False

if GITHUB_TOKEN:
    try:
        github_headers = {
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "ThaibaHive-Release-Script"
        }

        # Create Release
        print(f"\n[GitHub] Creating release {tag_name} on GitHub...")
        try:
            git_branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]).decode().strip()
        except Exception:
            git_branch = "main"

        release_payload = {
            "tag_name": tag_name,
            "target_commitish": git_branch,
            "name": f"ThaibaHive Release {tag_name}",
            "body": RELEASE_NOTES,
            "draft": False,
            "prerelease": "beta" in tag_name.lower()
        }

        req_data = json.dumps(release_payload).encode('utf-8')
        req = urllib.request.Request(
            f"https://api.github.com/repos/{REPO}/releases",
            data=req_data,
            headers={"Content-Type": "application/json", **github_headers},
            method="POST"
        )

        release_id = None
        try:
            with urllib.request.urlopen(req) as response:
                res = json.loads(response.read().decode())
                release_id = res["id"]
                html_url = res["html_url"]
                print(f"[SUCCESS] Created GitHub Release: {html_url}")
        except urllib.error.HTTPError as e:
            error_body = e.read().decode()
            if e.code == 422 and "already_exists" in error_body:
                print("[GitHub] Release already exists. Fetching existing release...")
                req = urllib.request.Request(
                    f"https://api.github.com/repos/{REPO}/releases/tags/{tag_name}",
                    headers=github_headers
                )
                try:
                    with urllib.request.urlopen(req) as response:
                        res = json.loads(response.read().decode())
                        release_id = res["id"]
                except Exception as ex:
                    print("[ERROR] Failed to fetch existing release:", ex)
            else:
                print("[ERROR] Failed to create release:", e.code, error_body)

        if release_id:
            # Upload APK asset
            print(f"[GitHub] Uploading {target_apk_name} as release asset...")
            with open(target_apk_path, "rb") as f:
                apk_bytes = f.read()

            upload_headers = {
                **github_headers,
                "Content-Type": "application/vnd.android.package-archive",
                "Content-Length": str(len(apk_bytes))
            }

            upload_url = f"https://uploads.github.com/repos/{REPO}/releases/{release_id}/assets?name={target_apk_name}"
            req = urllib.request.Request(upload_url, data=apk_bytes, headers=upload_headers, method="POST")

            try:
                with urllib.request.urlopen(req) as response:
                    res = json.loads(response.read().decode())
                    asset_download_url = res["browser_download_url"]
                    github_success = True
                    print(f"[SUCCESS] Uploaded asset to GitHub: {asset_download_url}")
            except urllib.error.HTTPError as e:
                error_body = e.read().decode()
                if e.code == 422 and "already_exists" in error_body:
                    print("[GitHub] Asset already exists. Fetching asset URL...")
                    req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/releases/{release_id}/assets", headers=github_headers)
                    with urllib.request.urlopen(req) as response:
                        assets = json.loads(response.read().decode())
                        for asset in assets:
                            if asset["name"] == target_apk_name:
                                asset_download_url = asset["browser_download_url"]
                                github_success = True
                                print(f"[SUCCESS] Re-used existing asset URL: {asset_download_url}")
                                break
                else:
                    print("[ERROR] Failed to upload asset:", e.code, error_body)
    except Exception as global_gh_err:
        print(f"\n[WARNING] GitHub release publication failed: {global_gh_err}")
else:
    print("\n[GitHub] GITHUB_TOKEN not configured. Skipping GitHub Release publication.")

# ─── 4. SYNC TO THAIBAHIVE PRODUCTION CONFIGS ─────────────────────────────────
if asset_download_url:
    print(f"\n[Backend] Syncing new release configurations to {API_URL}/system/update...")
    headers = {
        "Authorization": f"Bearer {SYSTEM_UPDATE_SECRET}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "latestVersion": raw_version,
        "downloadUrl": asset_download_url,
        "releaseNotes": RELEASE_NOTES,
        "forceUpdate": False
    }
    
    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f"{API_URL}/system/update",
        data=req_data,
        headers=headers,
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            print("[SUCCESS] Successfully updated system_configs table in database via API!")
            print(f"Latest Version: {raw_version}")
            print(f"Download Link: {asset_download_url}")
    except Exception as e:
        print("[ERROR] Failed to update backend system_configs:", e)
else:
    print("\n[Backend] Sync skipped. Build completed locally.")

# ─── 5. RECORD BUILD TO HISTORY ───────────────────────────────────────────────
try:
    import datetime
    history_path = os.path.join(os.path.dirname(BASE_DIR), "build_history.json")
    history = []
    if os.path.exists(history_path):
        with open(history_path, "r") as hf:
            try:
                history = json.load(hf)
            except Exception:
                pass

    apk_size_mb = os.path.getsize(target_apk_path) / 1024 / 1024 if os.path.exists(target_apk_path) else 0

    build_record = {
        "version": raw_version,
        "tag": tag_name,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "apk_name": target_apk_name,
        "apk_size_mb": round(apk_size_mb, 2),
        "status": "success"
    }
    history.append(build_record)

    with open(history_path, "w") as hf:
        json.dump(history, hf, indent=2)
    print(f"\n[History] Build successfully recorded in {history_path}")
except Exception as e:
    print(f"\n[Warning] Could not record build history: {e}")
