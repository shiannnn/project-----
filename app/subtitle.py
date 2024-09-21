import subprocess

def add_subtitle(input_file, output_file, subtitle_text, start_time, end_time):
    try:
        # 创建临时字幕文件
        subtitle_file = 'temp_subtitle.srt'
        with open(subtitle_file, 'w', encoding='utf-8') as f:
            f.write(f"1\n{format_time(start_time)} --> {format_time(end_time)}\n{subtitle_text}\n")

        # 使用 FFmpeg 添加字幕
        command = [
            'ffmpeg',
            '-i', input_file,
            '-vf', f"subtitles={subtitle_file}:force_style='FontSize=24,FontName=Arial,PrimaryColour=&HFFFFFF&,OutlineColour=&H80000000&,BorderStyle=3'",
            '-c:a', 'copy',
            '-y',  # 覆盖输出文件（如果存在）
            output_file
        ]
        
        subprocess.run(command, check=True)

        # 删除临时字幕文件
        import os
        os.remove(subtitle_file)

        return True
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg 命令执行失败: {e}")
        return False
    except Exception as e:
        print(f"添加字幕时发生错误: {e}")
        return False

def format_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"
