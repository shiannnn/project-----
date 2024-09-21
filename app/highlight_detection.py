import numpy as np
from pmdarima import auto_arima  # 使用自動化模型選擇

def detect_highlights(energy, pitch_values, sr, hop_length):
    threshold = 0.7  # 根據需要調整閾值
    highlight_frames = np.where(energy > threshold)[0]

    # 將幀轉換為時間
    highlight_times = highlight_frames * hop_length / sr

    # 計算音高的一階差分
    pitch_diff = np.diff(pitch_values)

    # 計算變化率，避免除以零
    change_rate = np.zeros_like(pitch_values[:-1])
    non_zero_mask = pitch_values[:-1] != 0
    change_rate[non_zero_mask] = np.abs(pitch_diff[non_zero_mask]) / pitch_values[:-1][non_zero_mask]

    # 設定變化率閾值
    pitch_threshold = 0.6  # 根據需要調整閾值

    # 標記音高變化顯著的幀
    pitch_change_frames = np.where(change_rate > pitch_threshold)[0]

    # 將幀轉換為時間
    pitch_change_times = pitch_change_frames * hop_length / sr

    # 合併兩個時間點，並去除重複
    highlight_times_combined = np.unique(np.concatenate((highlight_times, pitch_change_times)))

    # 新增：將前後兩個音頻高的部分結合在一起
    combined_highlight_times = []
    for i in range(len(highlight_times_combined) - 1):
        combined_highlight_times.append(highlight_times_combined[i])
        if highlight_times_combined[i+1] - highlight_times_combined[i] < 3:  # 如果兩個高點之間的間隔小於3秒
            combined_highlight_times.append((highlight_times_combined[i] + highlight_times_combined[i+1]) / 2)


    
    


    return np.unique(combined_highlight_times), energy

if __name__ == "__main__":
    from audio_analysis import analyze_audio
    y, sr, energy, pitch_values, hop_length = analyze_audio("audio.wav")
    highlight_times, _ = detect_highlights(energy, pitch_values, sr, hop_length)
    print("重要時刻的時間點（秒）：", highlight_times)