import librosa
import numpy as np
import matplotlib.pyplot as plt

def analyze_audio(audio_file):
    # 讀取音訊文件
    y, sr = librosa.load(audio_file, sr=None)

    # 設定窗口大小和步長
    frame_length = 2048
    hop_length = 512

    # 計算短時能量
    energy = np.array([
        np.sum(np.abs(y[i:i+frame_length]**2))
        for i in range(0, len(y), hop_length)
    ])

    # 正規化能量
    energy = energy / np.max(energy)

    # 計算 STFT
    D = np.abs(librosa.stft(y, n_fft=2048, hop_length=512))

    # 使用 piptrack 估計音高
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr, n_fft=2048, hop_length=512)

    # 提取主要音高
    pitch_values = []
    for i in range(magnitudes.shape[1]):
        index = np.argmax(magnitudes[:, i])
        pitch = pitches[:, i][index]
        if pitch > 0:
            pitch_values.append(pitch)
        else:
            pitch_values.append(np.nan)

    # 將音高數據轉換為 NumPy 陣列
    pitch_values = np.array(pitch_values)

    # 插值處理缺失值
    pitch_values = librosa.util.fix_frames(pitch_values)

    return y, sr, energy, pitch_values, hop_length

def plot_energy(energy):
    plt.figure(figsize=(14, 5))
    plt.plot(energy)
    plt.title("音量變化曲線")
    plt.xlabel("time")
    plt.ylabel("power")
    plt.show()

def plot_pitch(pitch_values):
    plt.figure(figsize=(14, 5))
    plt.plot(pitch_values)
    plt.title("音調變化曲線")
    plt.xlabel("time")
    plt.ylabel("frequency (Hz)")
    plt.show()

if __name__ == "__main__":
    y, sr, energy, pitch_values, hop_length = analyze_audio("audio.wav")
    plot_energy(energy)
    plot_pitch(pitch_values)