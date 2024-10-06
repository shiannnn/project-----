import os
import subprocess
import numpy as np
from app.emotion import predict,  processor, model  # 引入情緒判斷的模塊
from concurrent.futures import ThreadPoolExecutor

def create_highlight_video(video_path, highlight_times, energy, sr, hop_length, output_path="highlight_video.mp4"):
    duration = 20
    keep_start = 20
    clips = []
    emotions = []  # 新增一個列表來存儲每個片段的情緒
    for time in highlight_times:
        if (time - keep_start) <= 0 :
            start = 0   
        else:     
            start = find_low_energy_end((time - keep_start),energy, sr, hop_length, duration)  # 保留前 10 秒

        end = find_low_energy_end(time, energy, sr, hop_length, duration)
    
        # 確保結束時間晚於開始時間
        if end <= start:
            end = start + 1  # 如果結束時間不正確，將其設置為開始時間後 1 秒
        
        
        # 提取音頻片段
        audio_clip_path = f"temp_audio_{start}_{end}.wav"
        extract_audio_clip(video_path, start, end, audio_clip_path)
        
        # 判斷情緒
        emotion = predict(audio_clip_path, processor, model)
        os.remove(audio_clip_path)  # 刪除臨時音頻文件
        
        
        if emotion in ['excitement', 'surprise', 'happiness', 'angry', 'fear', 'positive']:  
            clips.append((start, end))
            emotions.append(emotion)  # 將情緒添加到列表中
    
    # 合併重疊的片段
    merged_clips = merge_overlapping_clips(clips)
    
    # 創建文件列表
    with open("file_list.txt", "w") as file:
        for i, (start, end) in enumerate(merged_clips):
            output_file = f"clip_{i+1}.mp4"
            
            # 生成剪輯命令，使用重新編碼以確保同步，添加 -y 參數
            command = f"ffmpeg -y -ss {start} -to {end} -i {video_path} -c:v libx264 -c:a aac -strict experimental {output_file}"
            subprocess.run(command, shell=True, check=True)
            
            # 將片段文件名添加到列表文件
            file.write(f"file '{output_file}'\n")
    # 紀錄情緒
    with open("emotion.txt", "w") as file:
        for i, (emotion) in enumerate(emotions):
            file.write(f"clip_{i+1}.mp4: {emotion}\n")

    # 合併所有片段，使用重新編碼以確保同步
    subprocess.run(f"ffmpeg -y -f concat -safe 0 -i file_list.txt -c:v libx264 -c:a aac -strict experimental {output_path}", shell=True, check=True)

    # 刪除臨時文件
    # for i in range(len(merged_clips)):
    #     os.remove(f"clip_{i+1}.mp4")
    os.remove("file_list.txt")


    return output_path

def extract_audio_clip(video_path, start, end, output_path):
    command = f"ffmpeg -y -ss {start} -to {end} -i {video_path} -q:a 0 -map a {output_path}"
    subprocess.run(command, shell=True, check=True)

def merge_overlapping_clips(clips):
    sorted_clips = sorted(clips, key=lambda x: x[0])
    merged = []
    for clip in sorted_clips:
        if not merged or clip[0] > merged[-1][1]:
            merged.append(clip)
        else:
            merged[-1] = (merged[-1][0], max(merged[-1][1], clip[1]))
    return merged

def process_clip(start, end, video_path, i):
    output_file = f"clip_{i+1}.mp4"
    command = f"ffmpeg -y -ss {start} -to {end} -i {video_path} -c:v libx264 -c:a aac -strict experimental {output_file}"
    subprocess.run(command, shell=True, check=True)
    return output_file

def find_low_energy_end(start_time, energy, sr, hop_length, max_duration):
    start_frame = int(start_time * sr / hop_length)
    end_frame = min(start_frame + int(max_duration * sr / hop_length), len(energy))
    
    # 計算能量的移動平均
    window_size = int(5 * sr / hop_length)  # 5秒的窗口
    energy_ma = np.convolve(energy[start_frame:end_frame], np.ones(window_size)/window_size, mode='valid')
    
    # 找到能量最低的點
    low_energy_frame = np.argmin(energy_ma) + start_frame + window_size // 2
    
    # 在低能量點附近的一小段時間內找到最低點
    search_range = int(5 * sr / hop_length)  # 搜索範圍為5秒
    search_start = max(low_energy_frame - search_range, start_frame)
    search_end = min(low_energy_frame + search_range, end_frame)
    
    final_low_energy_frame = search_start + np.argmin(energy[search_start:search_end])
    
    return final_low_energy_frame * hop_length / sr
