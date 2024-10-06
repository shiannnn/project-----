from transformers import pipeline, AutoModelForAudioClassification, AutoFeatureExtractor
import torch

highlight_emotions = ['excitement', 'surprise', 'happiness', 'angry', 'fear', 'positive']

label_list = [
        'sadness', 'fear', 'angry', 'happiness', 'disgust', 'neutral', 'surprise', 
        'positive', 'negative', 'excitement', 'frustrated', 'other', 'unknown'
    ]
model = AutoModelForAudioClassification.from_pretrained(
    "CAiRE/SER-wav2vec2-large-xlsr-53-eng-zho-all-age",
    attn_implementation="eager"
).to('cuda')

feature_extractor = AutoFeatureExtractor.from_pretrained("CAiRE/SER-wav2vec2-large-xlsr-53-eng-zho-all-age")

pipe = pipeline(
    "audio-classification",
    model=model,
    feature_extractor=feature_extractor,
    device="cuda:0"
)

# 使用绝对路径或确保相对路径正确
# audio_file_path = 'jfk.wav'  # 替换为实际的文件路径
# result = pipe(audio_file_path)

# 獲取分數最高的標籤
# top_result = max(result, key=lambda x: x['score'])

# 將標籤轉換為 label_list 中的字串
# label_index = int(top_result['label'].split('_')[1])
# top_result['label'] = label_list[label_index]

# # 判斷是否為精華情緒
# is_highlight = top_result['label'] in highlight_emotions

# print(top_result)
# print(top_result['label'])

def predict(path, processor=feature_extractor, model=model):
    result = pipe(path)
    top_result = max(result, key=lambda x: x['score'])
    label_index = int(top_result['label'].split('_')[1])
    emotion = label_list[label_index]
    return emotion
