from pydub import AudioSegment

def extract_audio(video_file, output_file):
    # 載入影片文件
    video = AudioSegment.from_file(video_file, format="mp4")

    # 將音訊導出為 WAV 格式
    video.export(output_file, format="wav")

if __name__ == "__main__":
    extract_audio("1.mp4", "audio.wav")