import os
import json
import base64
import requests

CONFIG_FILE = "git_config.json"
FILES_TO_PUSH = [
    "index.html",
    "style.css",
    "app.js",
    "data.json",
    "generate_data.py",
    "README.md",
    ".env"
]

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_config(config):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"설정 저장 실패: {e}")

def get_file_sha(repo, path, headers):
    url = f"https://api.github.com/repos/{repo}/contents/{path}"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json().get("sha")
    return None

def push_file_to_github(repo, token, local_path, git_path, headers):
    if not os.path.exists(local_path):
        print(f"오류: 로컬 파일이 존재하지 않습니다: {local_path}")
        return False

    # Read and base64 encode content
    try:
        with open(local_path, "rb") as f:
            file_data = f.read()
        encoded_content = base64.b64encode(file_data).decode("utf-8")
    except Exception as e:
        print(f"파일 읽기/인코딩 실패 ({local_path}): {e}")
        return False

    # Check for existing file SHA to update
    sha = get_file_sha(repo, git_path, headers)
    
    url = f"https://api.github.com/repos/{repo}/contents/{git_path}"
    payload = {
        "message": f"feat: UI 고도화 및 데이터 확충 ({local_path})",
        "content": encoded_content
    }
    if sha:
        payload["sha"] = sha

    response = requests.put(url, json=payload, headers=headers)
    if response.status_code in [200, 201]:
        print(f"성공: {local_path} -> GitHub ({'업데이트' if sha else '새로 생성'})")
        return True
    else:
        print(f"실패: {local_path} 전송 실패 (상태 코드 {response.status_code})")
        try:
            print("상세 에러:", response.json().get("message"))
        except Exception:
            print(response.text)
        return False

def main():
    print("=" * 60)
    print("🚀 GitHub API 기반 파일 업로드 및 배포 지원 스크립트")
    print("=" * 60)

    config = load_config()
    
    repo = config.get("repo", "")
    token = config.get("token", "")

    if not repo:
        repo = input("GitHub 저장소명 입력 (예: 사용자명/레포이름): ").strip()
    else:
        use_existing = input(f"기존 저장소({repo})를 사용하시겠습니까? (Y/n): ").strip().lower()
        if use_existing == 'n':
            repo = input("새로운 GitHub 저장소명 입력 (예: 사용자명/레포이름): ").strip()

    if not token:
        print("\n* GitHub Personal Access Token (PAT)이 필요합니다.")
        print("발급 방법: GitHub > Settings > Developer settings > Personal access tokens (classic) > 'repo' 권한 체크 후 발급")
        token = input("GitHub Access Token 입력: ").strip()
    else:
        use_existing_token = input("기존 토큰을 사용하시겠습니까? (Y/n): ").strip().lower()
        if use_existing_token == 'n':
            token = input("새로운 GitHub Access Token 입력: ").strip()

    if not repo or not token:
        print("저장소명과 토큰이 필요합니다. 종료합니다.")
        return

    # Save configuration locally for next time
    save_config({"repo": repo, "token": token})

    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json"
    }

    # Verify credentials
    user_url = "https://api.github.com/user"
    user_res = requests.get(user_url, headers=headers)
    if user_res.status_code != 200:
        print("\n❌ 오류: GitHub 토큰이 유효하지 않거나 권한이 없습니다. 토큰을 확인해 주세요.")
        return
    else:
        print(f"✓ 로그인 성공: {user_res.json().get('login')}")

    # Verify repository access
    repo_url = f"https://api.github.com/repos/{repo}"
    repo_res = requests.get(repo_url, headers=headers)
    if repo_res.status_code != 200:
        print(f"\n❌ 오류: 저장소({repo})에 접근할 수 없습니다. 저장소 이름 또는 토큰의 'repo' 권한을 확인해 주세요.")
        return
    else:
        print(f"✓ 저장소 접근 확인: {repo_res.json().get('full_name')}")

    print("\n📦 파일 업로드를 시작합니다...")
    success_count = 0
    for file_name in FILES_TO_PUSH:
        if push_file_to_github(repo, token, file_name, file_name, headers):
            success_count += 1

    print("\n" + "=" * 60)
    print(f"작업 완료: 총 {len(FILES_TO_PUSH)}개 파일 중 {success_count}개 성공.")
    if success_count == len(FILES_TO_PUSH):
        print("🎉 모든 파일이 정상적으로 GitHub에 업로드되었습니다!")
        print("Cloudflare Pages가 자동으로 감지하여 빌드/배포를 시작합니다.")
        print("수 분 내에 https://mediprice.pages.dev 에서 변경 사항을 확인할 수 있습니다.")
    else:
        print("⚠️ 일부 파일 업로드에 실패했습니다. 위의 로그를 확인하고 다시 시도해 주세요.")
    print("=" * 60)

if __name__ == "__main__":
    main()
