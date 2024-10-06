import numpy as np
from pmdarima import auto_arima  # 使用自動化模型選擇
from scipy.signal import find_peaks, medfilt

def detect_highlights(energy, pitch_values, sr, hop_length):
    # 主要的亮點檢測函數
    
    # 使用能量閾值檢測亮點
    threshold = 0.75  # 能量閾值
    highlight_frames = np.where(energy > threshold)[0]
    highlight_times = highlight_frames * hop_length / sr

    # 檢測音高變化
    pitch_diff = np.diff(pitch_values)
    change_rate = np.zeros_like(pitch_values[:-1])
    non_zero_mask = pitch_values[:-1] != 0
    change_rate[non_zero_mask] = np.abs(pitch_diff[non_zero_mask]) / pitch_values[:-1][non_zero_mask]

    pitch_threshold = 0.65  # 音高變化閾值
    pitch_change_frames = np.where(change_rate > pitch_threshold)[0]
    pitch_change_times = pitch_change_frames * hop_length / sr

    # 合併能量和音高變化的亮點
    highlight_times_combined = np.unique(np.concatenate((highlight_times, pitch_change_times)))



    # 檢測語速變化
    def detect_speech_rate_changes(energy, sr, hop_length):
        peaks, _ = find_peaks(energy, distance=int(0.2 * sr / hop_length))
        peak_times = peaks * hop_length / sr
        intervals = np.diff(peak_times)
        
        speech_rate = 1 / intervals
        
        # 確保 window_size 為奇數
        window_size = max(5, int(len(speech_rate) * 0.05))
        if window_size % 2 == 0:
            window_size += 1
        
        smoothed_rate = medfilt(speech_rate, kernel_size=window_size)
        
        rate_change = np.diff(smoothed_rate)
        rate_change_threshold = np.mean(np.abs(rate_change)) + 1.5 * np.std(np.abs(rate_change))
        rate_change_indices = np.where(np.abs(rate_change) > rate_change_threshold)[0]
        rate_change_times = peak_times[rate_change_indices]

        return rate_change_times
    
    # 獲取語速變化的時間點並添加到亮點中
    speech_rate_change_times = detect_speech_rate_changes(energy, sr, hop_length)
    highlight_times_combined = np.unique(np.concatenate((highlight_times_combined, speech_rate_change_times)))

    # 合併接近的亮點
    def merge_close_highlights(highlight_times, threshold=5):
        if len(highlight_times) < 2:
            return highlight_times

        merged = []
        current_group = [highlight_times[0]]

        for t in highlight_times[1:]:
            if t - current_group[-1] < threshold:
                current_group.append(t)
            else:
                merged.append(np.mean(current_group))
                current_group = [t]

        merged.append(np.mean(current_group))
        return np.array(merged)

    highlight_times_combined = merge_close_highlights(highlight_times_combined)

    return np.unique(highlight_times_combined), energy

if __name__ == "__main__":
    # 測試代碼
    from audio_analysis import analyze_audio
    y, sr, energy, pitch_values, hop_length = analyze_audio("audio.wav")
    highlight_times, _ = detect_highlights(energy, pitch_values, sr, hop_length)
    print("重要時刻的時間點（秒）：", highlight_times)