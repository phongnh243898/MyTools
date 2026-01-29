import os
import requests
import json
import re
import subprocess
from urllib.parse import urljoin

# Cấu hình
LOGIN_CF_FILE = "login.cf"
BASE_URL = "https://www.ai-studio.co.kr"
BASE_PATH = "https://img-edge.ai-studio.co.kr/"
ARIA2C_PATH = "./bin/aria2c.exe"

# Khởi tạo session toàn cục
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
})

def load_auth_config():
    if not os.path.exists(LOGIN_CF_FILE):
        print(f"[-] Không tìm thấy file {LOGIN_CF_FILE}")
        return None
    try:
        with open(LOGIN_CF_FILE, "r", encoding="utf-8") as f:
            content = f.read()
            json_str = re.sub(r'^\\s*', '', content).strip()
            data = json.loads(json_str)
        cookies = data.get("cookie", {})
        for name, value in cookies.items():
            session.cookies.set(name, value, domain="www.ai-studio.co.kr")
        return data.get("csrf")
    except Exception as e:
        print(f"[-] Lỗi đọc cấu hình: {e}")
        return None

def fetch_bearer_token(project_id, task_id):
    url = f"{BASE_URL}/annotation/workLidar"
    params = {"reqType": "master", "projectId": project_id, "taskId": task_id}
    r = session.get(url, params=params)
    r.raise_for_status()
    m = re.search(r'page\.param\.token\s*=\s*"([^"]+)"', r.text)
    if not m:
        if "login" in r.url:
            raise Exception("Session hết hạn trong login.cf")
        return None
    return m.group(1)

def get_task_info(search_val, csrf):
    url = f"{BASE_URL}/fo/task/procLoadMasterViewList"
    payload = {
        "searchType": "taskName",
        "searchVal": search_val,
        "pageIndex": 1,
        "prjWorkDivision": "processing",
        "_csrf": csrf
    }
    headers = {"X-Requested-With": "XMLHttpRequest"}
    r = session.post(url, data=payload, headers=headers)
    r.raise_for_status()
    items = r.json().get("data", {}).get("data", [])
    return items[0] if items else None

def get_lidar_list(bearer, project_id, task_id):
    url = f"{BASE_URL}/apis/v1/workspace/master/lidarList"
    headers = {"Authorization": f"Bearer {bearer}", "X-Requested-With": "XMLHttpRequest"}
    payload = {
        "projectId": project_id, "taskId": task_id, "reqType": "master",
        "pageIndex": 1, "pageSize": 100, "filterStatus": "filter_status_all", "addAssignImage": "true"
    }
    r = session.post(url, headers=headers, data=payload)
    r.raise_for_status()
    return r.json()

def main():
    tasks = []
    print("Enter taskName (Ctrl+D hoặc Enter trống để kết thúc):")
    while True:
        try:
            v = input(">> ").strip()
            if not v: break
            tasks.append(v)
        except (EOFError, KeyboardInterrupt):
            break

    if not tasks:
        return

    # 2. Nạp cấu hình từ login.cf
    csrf = load_auth_config()
    if not csrf:
        print("[-] Không có CSRF. Dừng chương trình.")
        return

    os.makedirs("./raw", exist_ok=True)
    for task_name in tasks:
        print(f"\n[*] Đang xử lý: {task_name}")
        info = get_task_info(task_name, csrf)
        
        if not info:
            print(f"[-] Không tìm thấy thông tin task: {task_name}")
            continue

        try:
            bearer = fetch_bearer_token(info["projectId"], info["taskId"])
            if not bearer:
                print(f"[-] Không lấy được Bearer cho {task_name}")
                continue

            lidar_data = get_lidar_list(bearer, info["projectId"], info["taskId"])
            task_dir = f"./raw/{task_name}"
            os.makedirs(task_dir, exist_ok=True)
            list_file = f"./raw/{task_name}_aria2c_list"
            with open(list_file, "w", encoding="utf-8") as wf:
                for item in lidar_data.get("data", []):
                    pcd_url = urljoin(BASE_PATH, f"{item['rawFilePath'].strip('/')}/{item['rawFileName']}")
                    wf.write(f"{pcd_url}\n  out={item['originalFileName']}\n  dir={task_dir}\n")
                    for cam in item.get("cameraImageList", []):
                        img_url = urljoin(BASE_PATH, f"{cam['rawFilePath'].strip('/')}/{cam['rawFileName']}")
                        wf.write(f"{img_url}\n  out={cam['originalFileName']}\n  dir={task_dir}\n")

            print(f"[+] Đã tạo danh sách tải: {list_file}")
        except Exception as e:
            print(f"[-] Lỗi hệ thống với task {task_name}: {e}")

    # thực thi tải xuống
    confirm = input("\nStart download? (y/n)\n>> ").strip().lower()
    if confirm == "y":
        for task_name in tasks:
            l_file = f"./raw/{task_name}_aria2c_list"
            if os.path.exists(l_file):
                subprocess.run([ARIA2C_PATH, "-i", l_file])

if __name__ == "__main__":
    main()