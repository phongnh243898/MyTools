import requests
import json
import os
import re
import time

BASE_URL = "https://www.ai-studio.co.kr"
DASHBOARD_URL = f"{BASE_URL}/fo/board/dashboard"
LOGIN_PROC_URL = f"{BASE_URL}/loginProcess"
OTP_VERIFY_URL = f"{BASE_URL}/auth/otp/verify"
CACHE_FILE = "login.cf"

class AuthManager:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
        })
        self.auth_data = {"id": "", "pwd": "", "cookie": {}, "csrf": "", "bearer": ""}

    def _log(self, level, msg):
        print(f"[{time.strftime('%H:%M:%S')}] [{level}] {msg}")

    def get_csrf(self, url):
        try:
            r = self.session.get(url, timeout=10)
            match = re.search(r'<meta name="_csrf" content="([^"]+)"', r.text)
            return match.group(1) if match else ""
        except:
            return ""

    def is_session_alive(self):
        try:
            headers = {"X-CSRF-TOKEN": self.auth_data.get("csrf", "")}
            r = self.session.get(DASHBOARD_URL, headers=headers, allow_redirects=False, timeout=10)
            if r.status_code == 200:
                return True
            else:
                self._log("WARN", f"Session không hợp lệ (Status: {r.status_code}). Sẽ đăng nhập lại.")
                return False
        except Exception as e:
            self._log("ERROR", f"Lỗi kết nối khi check session: {e}")
            return False

    def load_cache(self):
        if not os.path.exists(CACHE_FILE):
            return False
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.auth_data.update(data)
            if not self.auth_data["cookie"] or not self.auth_data["csrf"]:
                return False
            for k, v in self.auth_data["cookie"].items():
                self.session.cookies.set(k, v, domain="www.ai-studio.co.kr")
            return True
        except:
            return False

    def save_cache(self):
        self.auth_data["cookie"] = self.session.cookies.get_dict()
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(self.auth_data, f, indent=4, ensure_ascii=False)

    def login(self):
        self._log("INFO", f"Đang tiến hành đăng nhập mới cho ID: {self.auth_data['id']}...")
        csrf_login = self.get_csrf(f"{BASE_URL}/login")
        if not csrf_login:
            self._log("ERROR", "Không lấy được CSRF tại trang Login.")
            return
        payload = {
            "id": self.auth_data["id"],
            "pwd": self.auth_data["pwd"],
            "_csrf": csrf_login
        }
        res = self.session.post(LOGIN_PROC_URL, data=payload, headers={"Referer": f"{BASE_URL}/login"})
        if "/loginOtp" in res.url or "otp" in res.text.lower():
            otp_code = input("[>>] Nhập mã OTP từ Console: ").strip()
            csrf_otp = self.get_csrf(f"{BASE_URL}/loginOtp") or csrf_login
            otp_payload = {
                "otpCode": otp_code,
                "_csrf": csrf_otp
            }
            self.session.post(OTP_VERIFY_URL, data=otp_payload, headers={"Referer": f"{BASE_URL}/loginOtp"})

        if self.is_session_alive():
            self._log("SUCCESS", "ĐĂNG NHẬP THÀNH CÔNG!")
            self.auth_data["csrf"] = self.get_csrf(DASHBOARD_URL)
            self.save_cache()
        else:
            self._log("ERROR", "Đăng nhập thất bại. Vui lòng kiểm tra lại ID/PWD hoặc OTP.")

    def ensure_auth(self):
        if self.load_cache() and self.is_session_alive():
            return
        if not self.auth_data["id"] or not self.auth_data["pwd"]:
            return
        
        self.login()

if __name__ == "__main__":
    manager = AuthManager()
    manager.ensure_auth()
