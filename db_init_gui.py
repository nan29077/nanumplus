import subprocess
import tkinter as tk
from tkinter import scrolledtext
import threading
import os
import sys
import traceback

CWD = r"E:\프로젝트\nanumplus"
LOG_FILE = r"E:\프로젝트\nanumplus\db_init_log.txt"

def run_command(cmd, output_widget):
    output_widget.insert(tk.END, f"\n{'='*50}\n>>> {cmd}\n{'='*50}\n")
    output_widget.see(tk.END)
    output_widget.update()
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=CWD,
            shell=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        for line in process.stdout:
            output_widget.insert(tk.END, line)
            output_widget.see(tk.END)
            output_widget.update()
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(line)
        process.wait()
        return process.returncode
    except Exception as e:
        output_widget.insert(tk.END, f"오류: {e}\n")
        return 1

def run_all(output, status_label):
    commands = [
        "npm run db:push",
        "npm run db:seed",
        "npm run db:init-admin",
    ]
    for cmd in commands:
        status_label.config(text=f"실행 중: {cmd}", fg="blue")
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"\n>>> {cmd}\n")
        ret = run_command(cmd, output)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"종료 코드: {ret}\n")
        if ret != 0:
            status_label.config(text=f"[오류] {cmd} 실패 (코드: {ret})", fg="red")
            output.insert(tk.END, f"\n[오류] {cmd} 실패! 위 내용을 확인하세요.\n")
            return
    output.insert(tk.END, "\n\n✅ DB 초기화 완료!\n")
    output.insert(tk.END, "이제 npm run dev를 실행할 수 있습니다.\n")
    status_label.config(text="✅ 완료!", fg="green")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write("\n✅ 완료!\n")

def main():
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        f.write("나눔플러스 DB 초기화 시작\n")
    root = tk.Tk()
    root.title("나눔플러스 DB 초기화")
    root.geometry("900x650")

    output = scrolledtext.ScrolledText(root, wrap=tk.WORD, font=("Consolas", 10))
    output.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

    status_label = tk.Label(root, text="시작 중...", font=("Arial", 12), anchor="w")
    status_label.pack(fill=tk.X, padx=5, pady=(0, 5))

    output.insert(tk.END, f"작업 디렉토리: {CWD}\n")

    thread = threading.Thread(target=run_all, args=(output, status_label), daemon=True)
    thread.start()

    root.mainloop()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"\n[FATAL ERROR]\n{traceback.format_exc()}\n")
        raise
