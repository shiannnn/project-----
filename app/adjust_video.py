import subprocess
import os

def adjust_video(input_file, output_file, speed, volume):
    try:
        # 確保輸出目錄存在
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        # 使用 ffmpeg 同時調整視頻速度和音量
        command = [
            'ffmpeg',
            '-i', input_file,
            '-filter_complex',
            f'[0:v]setpts={1/speed}*PTS[v];[0:a]atempo={speed},volume={volume}[a]',
            '-map', '[v]',
            '-map', '[a]',
            '-y',  # 覆蓋輸出文件（如果存在）
            output_file
        ]

        # 執行 ffmpeg 命令
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        return True, output_file
    except subprocess.CalledProcessError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

# 可以保留原來的函數作為備用
def adjust_video_speed(input_file, output_file, speed):
    return adjust_video(input_file, output_file, speed, 1.0)

def adjust_video_volume(input_file, output_file, volume):
    return adjust_video(input_file, output_file, 1.0, volume)
