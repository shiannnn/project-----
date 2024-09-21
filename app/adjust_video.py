import subprocess
import os

def adjust_video_speed(input_file, output_file, speed):
    try:
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        # 使用 ffmpeg 调整视频速度
        command = [
            'ffmpeg',
            '-i', input_file,
            '-filter:v', f'setpts={1/speed}*PTS',
            '-filter:a', f'atempo={speed}',
            '-y',  # 覆盖输出文件（如果存在）
            output_file
        ]

        # 执行 ffmpeg 命令
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        return True, output_file
    except subprocess.CalledProcessError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

def adjust_video_volume(input_file, output_file, volume):
    try:
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        # 使用 ffmpeg 调整视频音量
        command = [
            'ffmpeg',
            '-i', input_file,
            '-filter:a', f'volume={volume}',
            '-y',  # 覆盖输出文件（如果存在）
            output_file
        ]

        # 执行 ffmpeg 命令
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        return True, output_file
    except subprocess.CalledProcessError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)