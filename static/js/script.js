document.addEventListener('DOMContentLoaded', () => {
    try {
        const form = document.getElementById('upload-form');
        const fileInput = document.getElementById('file-input');
        const message = document.getElementById('message');
        const downloadButton = document.getElementById('download-button');
        const progressBar = document.getElementById('progress-bar');
        const previewContainer = document.getElementById('preview-container');
        const previewVideo = document.getElementById('preview-video');
        const timeline = document.getElementById('timeline');
        const currentTime = document.getElementById('current-time');
        const totalTime = document.getElementById('total-time');
        const startMarker = document.getElementById('start-marker');
        const setStartTimeBtn = document.getElementById('set-start-time');
        const setEndTimeBtn = document.getElementById('set-end-time');
        const subtitleContainer = document.getElementById('subtitle-container');
        const timeMarkersContainer = document.getElementById('time-markers');


        if (!form || !fileInput || !message || !downloadButton || !progressBar || !previewContainer || !previewVideo || !timeline || !currentTime || !totalTime || !startMarker  || !setStartTimeBtn || !setEndTimeBtn) {
            throw new Error('One or more required DOM elements are missing');
        }

        let currentSpeed = 1; // 默认速度为 1x
        let originalVideo = null; // 用于存储原始视频文件名
        let previewVideoUrl = null; // 用于存储预览视频的 URL
        let isChangedVolume = false; // 用于判断视频是否已经处理
        let isChangedSpeed = false; // 用于判断视频是否已经处理
        let ChangedVolumeFileName = null; // 用于存储改变后的文件名
        let ChangedSpeedFileName = null; // 用于存储改变后的文件名
        let onlyChangedVolume = null; // 只有改变音量
        let onlyChangedSpeed = null; // 只有改变速度
        let currentSubtitleFile = null; // 当前字幕文件名
        let startTime = 0;
        let endTime = 0;

        // 格式化时间,将秒数转换为分:秒格式
        function formatTime(timeInSeconds) {
            const minutes = Math.floor(timeInSeconds / 60);
            const seconds = Math.floor(timeInSeconds % 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // 更新时间显示的函数
        function updateTimeDisplay(time) {
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // 更新标记位置的函数
        function updateMarkerPosition(marker, time) {
            const percentage = (time / previewVideo.duration) * 100;
            marker.style.left = `${percentage}%`;
        }
        function updateTimeMarkers(duration) {
            timeMarkersContainer.innerHTML = ''; // 清空现有的时间标记
            const interval = duration / 10; // 每10%添加一个标记
            for (let i = 0; i <= 10; i++) {
                const time = interval * i;
                const marker = document.createElement('div');
                marker.className = 'time-marker';
                marker.style.left = `${(time / duration) * 100}%`;
                marker.textContent = formatTime(time);
                timeMarkersContainer.appendChild(marker);
            }
        }
        function updateSubtitleBlocks(subtitles) {
            subtitleContainer.innerHTML = ''; // 清空现有的字幕图块
            subtitles.forEach(subtitle => {
                const block = document.createElement('div');
                block.className = 'subtitle-block';
                block.style.left = `${(subtitle.startTime / previewVideo.duration) * 100}%`;
                block.style.width = `${((subtitle.endTime - subtitle.startTime) / previewVideo.duration) * 100}%`;
                block.textContent = subtitle.text;
                subtitleContainer.appendChild(block);
            });
        }
        // 當視頻元數據加載完成時,設置時間軸最大值和總時間
        previewVideo.addEventListener('loadedmetadata', () => {
            timeline.max = previewVideo.duration;
            totalTime.textContent = formatTime(previewVideo.duration);
            updateTimeMarkers(previewVideo.duration);
        });

        // 當視頻播放時間更新時,同步更新時間軸和當前時間顯示
        previewVideo.addEventListener('timeupdate', () => {
            if (!isNaN(previewVideo.duration)) {
                timeline.value = previewVideo.currentTime;
                currentTime.textContent = formatTime(previewVideo.currentTime);
            }
        });

        // 當用戶拖動時間軸時,更新視頻播放位置
        timeline.addEventListener('input', () => {
            previewVideo.currentTime = timeline.value;
        });

        // 设置开始时间
        setStartTimeBtn.addEventListener('click', () => {
            startTime = previewVideo.currentTime;
            updateMarkerPosition(startMarker, startTime);
            document.getElementById('start-time').value = startTime.toFixed(2);
        });



        // 允许拖动标记
        let isDragging = false;
        let currentMarker = null;

        function startDrag(e) {
            isDragging = true;
            currentMarker = e.target;
        }

        function stopDrag() {
            isDragging = false;
            currentMarker = null;
        }

        function drag(e) {
            if (isDragging && currentMarker) {
                const rect = timeline.getBoundingClientRect();
                const percentage = (e.clientX - rect.left) / rect.width;
                const time = percentage * previewVideo.duration;
                
                if (currentMarker === startMarker) {
                    startTime = time;
                    document.getElementById('start-time').value = startTime.toFixed(2);
                } else if (currentMarker === endMarker) {
                    endTime = time;
                    document.getElementById('end-time').value = endTime.toFixed(2);
                }
                
                updateMarkerPosition(currentMarker, time);
            }
        }

        startMarker.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);

        // 當用戶選擇文件時,重置所有相關變量
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // 重置所有相關變量
                previewVideoUrl = URL.createObjectURL(file);
                currentSpeed = 1;
                isProcessed = false;
                originalVideo = file.name;
                

                // 重置UI
                downloadButton.style.display = 'none';
                message.textContent = '';
                form.style.display = 'block'; // 显示上传表单
                
                // 移除"如需重新剪辑"的消息（如果存在）
                const resetMessage = document.querySelector('p[style="color: blue;"]');
                if (resetMessage) {
                    resetMessage.remove();
                }
                
                // 更新预览视频
                updatePreviewVideo();
                

                // 重置速度选项
                const speedOptionsContainer = document.getElementById('speed-options');
                speedOptionsContainer.style.display = 'none';
                speedOptionsContainer.innerHTML = '';

                // 重置进度条
                progressBar.style.display = 'none';
                progressBar.value = 0;

                // 发送文件到后端
                const formData = new FormData();
                formData.append('file', file);

                fetch('/save_file_info', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.message) {
                        console.log('文件信息已保存到后端:', data.message);
                    } else {
                        console.error('保存文件信息失败:', data.error);
                    }
                })
                .catch(error => {
                    console.error('保存文件信息时发生错误:', error);
                });

                console.log('文件已选择:', originalVideo);
            }
        });

        // 更新预览视频的源和播放状态
        function updatePreviewVideo() {
            if (previewVideoUrl) {
                previewVideo.src = previewVideoUrl;
                previewContainer.style.display = 'block';
                previewVideo.playbackRate = currentSpeed;
                previewVideo.play();
            }
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const file = fileInput.files[0];
            if (!file) {
                message.textContent = '請選擇一個檔案';
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('speed', currentSpeed);

            // 显示加载覆盖层
            const loadingOverlay = document.getElementById('loading-overlay');
            const loadingMessage = document.getElementById('loading-message');
            loadingMessage.textContent = '正在上傳並處理影片，請稍候...';
            loadingOverlay.style.display = 'flex';

            message.textContent = '';
            downloadButton.style.display = 'none';
            progressBar.style.display = 'block';
            progressBar.value = 0;
            previewContainer.style.display = 'none';
            previewVideo.pause();
            previewVideo.currentTime = 0;

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    checkProgress(result.task_id);
                } else {
                    message.textContent = result.error;
                    message.style.color = 'red';
                    progressBar.style.display = 'none';
                    // 隐藏加载覆盖层
                    loadingOverlay.style.display = 'none';
                }
            } catch (error) {
                console.error('錯誤:', error);
                message.textContent = '上傳檔案時發生錯誤';
                message.style.color = 'red';
                progressBar.style.display = 'none';
                // 隐藏加载覆盖层
                loadingOverlay.style.display = 'none';
            }
        });

        // 修改 checkProgress 函数
        function checkProgress(taskId) {
            fetch(`/progress/${taskId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Progress data:', data);
                    if (typeof data.progress !== 'number') {
                        throw new Error('Invalid progress data');
                    }
                    progressBar.value = data.progress;
                    if (data.progress < 100 && data.progress >= 0) {
                        setTimeout(() => checkProgress(taskId), 1000);
                    } else if (data.progress === 100) {
                        message.textContent = '影片處理成功';
                        message.style.color = 'green';
                        const ChangedFileName = taskId.replace('.mp4', '') + '_highlight.mp4';
                        downloadButton.onclick = () => {
                            window.location.href = `/download/${ChangedFileName}`;
                        };
                        downloadButton.style.display = 'block';
                        progressBar.style.display = 'none';
                        
                        previewVideo.src = `/preview_highlight/${taskId}`;
                        previewContainer.style.display = 'block';
                        previewVideo.load();
                        
                        originalVideo = ChangedFileName;
                        
                        const processingCompleteMessage = document.createElement('p');
                        processingCompleteMessage.textContent = '处理完成。您可以下载处理后的视频，或选择新文件重新开始。';
                        processingCompleteMessage.style.color = 'blue';
                        form.parentNode.insertBefore(processingCompleteMessage, form.nextSibling);

                        // 隐藏加载覆盖层
                        document.getElementById('loading-overlay').style.display = 'none';
                    } else {
                        throw new Error('Invalid progress value');
                    }
                })
                .catch(error => {
                    console.error('檢查進度時發生錯誤:', error);
                    message.textContent = '檢查進度時發生錯誤: ' + error.message;
                    message.style.color = 'red';
                    progressBar.style.display = 'none';
                    // 隐藏加载覆盖层
                    document.getElementById('loading-overlay').style.display = 'none';
                });
        }

        // 處理側邊欄按鈕點擊事件
        function handleSidebarButtonClick(event) {
            const option = event.target.dataset.option;
            switch (option) {
                case 'volume':
                    adjustVolume();
                    break;
                case 'speed':
                    adjustSpeed();
                    break;
                case 'fade':
                    applyFade();
                    break;
                case 'subtitle':
                    addSubtitle();
                    break;
                case 'effects':
                    applyEffects();
                    break;
            }
        }

        // 调整音量功能
        function adjustVolume() {
            if (!originalVideo) {
                message.textContent = '请先上传视频，然后再调整音量。';
                message.style.color = 'red';
                return;
            }

            const volumeOptionsContainer = document.getElementById('volume-options');
            
            // 切换音量选项的显示状态
            volumeOptionsContainer.style.display = volumeOptionsContainer.style.display === 'none' ? 'block' : 'none';

            // 如果是显示状态，创建音量滑块
            if (volumeOptionsContainer.style.display === 'block') {
                volumeOptionsContainer.innerHTML = ''; // 清空现有的选项
                
                const volumeSlider = document.createElement('input');
                volumeSlider.type = 'range';
                volumeSlider.min = 0;
                volumeSlider.max = 200;
                volumeSlider.value = 100;
                volumeSlider.step = 1;
                volumeSlider.classList.add('volume-slider');

                const volumeLabel = document.createElement('span');
                volumeLabel.textContent = '100%';
                volumeLabel.classList.add('volume-label');

                volumeSlider.oninput = () => {
                    volumeLabel.textContent = `${volumeSlider.value}%`;
                };

                volumeSlider.onchange = () => {
                    applyVolumeChange(volumeSlider.value / 100);
                };

                volumeOptionsContainer.appendChild(volumeSlider);
                volumeOptionsContainer.appendChild(volumeLabel);
            }
        }

        // 应用音量变化
        function applyVolumeChange(volume) {
            let inputFile;
            if (isChangedVolume && isChangedSpeed) {
                // 如果音量和速度都改变了，使用只改变速度后的文件（速度为1的文件）
                inputFile = onlyChangedSpeed;
            } else if (isChangedSpeed) {
                // 如果只改变了速度，使用改变速度后的文件
                inputFile = ChangedSpeedFileName;
            } else {
                // 如果都没有改变，使用原始文件
                inputFile = originalVideo;
            } 

            fetch('/adjust_volume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input_file: inputFile,
                    volume: volume,
                }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.output_file) {
                    // 更新预览视频为新的调音视频
                    previewVideo.src = `/preview/${data.output_file}`;
                    previewVideo.load();
                    previewVideo.play();
                    
                    // 更新下载按钮链接
                    downloadButton.onclick = () => {
                        window.location.href = `/download/${data.output_file}`;
                    };
                    downloadButton.style.display = 'block';
                    
                    message.textContent = '视频音量调整成功';
                    message.style.color = 'green';
                    
                    if(isChangedVolume==0) onlyChangedVolume = data.output_file;
                    isChangedVolume = true;
                    ChangedVolumeFileName = data.output_file;
                } else {
                    throw new Error(data.error || '调整视频音量失败');
                }
            })
            .catch(error => {
                console.error('调整视频音量时发生错误:', error);
                message.textContent = '调整视频音量时发生错误: ' + error.message;
                message.style.color = 'red';
            });
        }

        // 調整播放速度功能
        function adjustSpeed() {
            if (!originalVideo) {
                message.textContent = '请先上传视频，然后再调整速度。';
                message.style.color = 'red';
                return;
            }

            const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const speedOptionsContainer = document.getElementById('speed-options');
            
            // 切换速度选项的显示状态
            speedOptionsContainer.style.display = speedOptionsContainer.style.display === 'none' ? 'block' : 'none';

            // 如果是显示状态，创建速度选项按钮
            if (speedOptionsContainer.style.display === 'block') {
                speedOptionsContainer.innerHTML = ''; // 清空现有的选项
                speedOptions.forEach(speed => {
                    const speedButton = document.createElement('button');
                    speedButton.textContent = `${speed}x`;
                    speedButton.classList.add('speed-option');
                    if (speed === currentSpeed) {
                        speedButton.classList.add('selected');
                    }
                    speedButton.onclick = () => selectSpeed(speed);
                    speedOptionsContainer.appendChild(speedButton);
                });
            }
        }

        // 選擇播放速度
        function selectSpeed(speed) {
            if (!originalVideo) {
                message.textContent = '请先上传视频，然后再调整速度。';
                message.style.color = 'red';
                return;
            }

            currentSpeed = speed;
            const speedButtons = document.querySelectorAll('.speed-option');
            speedButtons.forEach(button => {
                if (parseFloat(button.textContent) === speed) {
                    button.classList.add('selected');
                } else {
                    button.classList.remove('selected');
                }
            });

            if (previewVideo.src) {
                previewVideo.playbackRate = speed;
                adjustVideoSpeed(speed);
            }
        }

        // 調整視頻播放速度並處理
        function adjustVideoSpeed(speed) {
            if (!originalVideo) {
                message.textContent = '请先上传视频，然后再调整速度。';
                message.style.color = 'red';
                return;
            }

            let inputFile;
            if (isChangedVolume && isChangedSpeed) {
                // 如果音量和速度都改变了，使用只改变音量后的文件（速度为1的文件）
                inputFile = onlyChangedVolume;
            } else if (isChangedVolume) {
                // 如果只改变了音量，使用改变音量后的文件
                inputFile = ChangedVolumeFileName;
            } else {
                // 如果没有改变音量，使用原始文件
                inputFile = originalVideo;
            } 
            
            fetch('/adjust_speed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input_file: inputFile,
                    speed: speed,
                }),
            })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('调整速度的接口未找到，请确保服务器正在运行并且路由正确配置。');
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.output_file) {
                    // 更新预览视频为新的调速视频
                    previewVideo.src = `/preview/${data.output_file}`;
                    previewVideo.load();
                    previewVideo.play();
                    
                    // 更新下载按钮链接
                    downloadButton.onclick = () => {
                        window.location.href = `/download/${data.output_file}`;
                    };
                    downloadButton.style.display = 'block';
                    
                    message.textContent = '视频速度调整成功';
                    message.style.color = 'green';

                    if(isChangedSpeed==0) onlyChangedSpeed = data.output_file;
                   isChangedSpeed = true;
                    ChangedSpeedFileName = data.output_file;

                } else {
                    throw new Error(data.error || '调整视频速度失败');
                }
            })
            .catch(error => {
                console.error('调整视频速度时发生错误:', error);
                message.textContent = '调整视频速度时发生错误: ' + error.message;
                message.style.color = 'red';
            });
        }

        // 應用淡入淡出效果(待實現)
        function applyFade() {
            console.log('應用淡入淡出');
        }

        // 添加字幕功能
        function addSubtitle() {
            if (!originalVideo) {
                message.textContent = '请先上传视频，然后再添加字幕。';
                message.style.color = 'red';
                return;
            }

            const subtitleOptionsContainer = document.getElementById('subtitle-options');
        
            // 切换字幕选项的显示状态
            subtitleOptionsContainer.style.display = subtitleOptionsContainer.style.display === 'none' ? 'block' : 'none';

            // 如果是显示状态，创建字幕输入表单
            if (subtitleOptionsContainer.style.display === 'block') {
                subtitleOptionsContainer.innerHTML = `
                    <input type="text" id="start-time" placeholder="开始时间 (秒)" class="time-input">
                    <input type="text" id="end-time" placeholder="结束时间 (秒)" class="time-input">
                    <textarea id="subtitle-text" placeholder="输入字幕内容" class="subtitle-input"></textarea>
                    <button id="submit-subtitle">添加字幕</button>
                `;

                document.getElementById('submit-subtitle').onclick = () => {
                    const startTime = document.getElementById('start-time').value;
                    const endTime = document.getElementById('end-time').value;
                    const subtitleText = document.getElementById('subtitle-text').value;
                    submitSubtitle(subtitleText, startTime, endTime);
                };
            }
        }
        // 更新字幕图块位置和宽度
        function updateSubtitleBlocks(subtitles) {
            subtitleContainer.innerHTML = ''; // 清空现有的字幕图块
            subtitles.forEach(subtitle => {
                const block = document.createElement('div');
                block.className = 'subtitle-block';
                block.style.left = `${(subtitle.startTime / previewVideo.duration) * 100}%`;
            block.style.width = `${((subtitle.endTime - subtitle.startTime) / previewVideo.duration) * 100}%`;
            block.textContent = subtitle.text;
            subtitleContainer.appendChild(block);
        });
    }
        function submitSubtitle(subtitleText, startTime, endTime) {
            let inputFile = originalVideo;
            if (currentSubtitleFile) {
                inputFile = currentSubtitleFile;
            }

            // 显示加载指示器
            document.getElementById('loading-overlay').style.display = 'flex';

            fetch('/add_subtitle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input_file: inputFile,
                    subtitle_text: subtitleText,
                    start_time: startTime,
                    end_time: endTime,
                }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.output_file) {
                    // 更新预览视频为新的带字幕视频
                    previewVideo.src = `/preview/${data.output_file}`;
                    previewVideo.load();
                    previewVideo.play();
                    
                    // 更新下载按钮链接
                    downloadButton.onclick = () => {
                        window.location.href = `/download/${data.output_file}`;
                    };
                    downloadButton.style.display = 'block';
                    
                    message.textContent = '字幕添加成功';
                    message.style.color = 'green';

                    currentSubtitleFile = data.output_file;
                     // 更新字幕图块
                    const newSubtitle = {
                        text: subtitleText,
                        startTime: parseFloat(startTime),
                        endTime: parseFloat(endTime)
                    };
                    updateSubtitleBlocks([newSubtitle]);
                } else {
                    throw new Error(data.error || '添加字幕失败');
                }
            })
            .catch(error => {
                console.error('添加字幕时发生错误:', error);
                message.textContent = '添加字幕时发生错误: ' + error.message;
                message.style.color = 'red';
            })
            .finally(() => {
                // 隐藏加载指示器
                document.getElementById('loading-overlay').style.display = 'none';
            });
        }

        // 應用特效功能(待實現)
        function applyEffects() {
            console.log('應用特效');
        }

        // 添加這行來獲取所有側邊欄按鈕
        const sidebarButtons = document.querySelectorAll('.sidebar-btn');

        // 為每個側邊欄按鈕添加點擊事件監聽器
        sidebarButtons.forEach(button => {
            button.addEventListener('click', handleSidebarButtonClick);
        });

        // 创建音量选项容器
        const sidebarList = document.querySelector('.sidebar ul');
        const volumeOptionsContainer = document.createElement('div');
        volumeOptionsContainer.id = 'volume-options';
        volumeOptionsContainer.className = 'option-container';
        volumeOptionsContainer.style.display = 'none';
        sidebarList.insertBefore(volumeOptionsContainer, sidebarList.children[1]);

        // 创建字幕选项容器
        const subtitleOptionsContainer = document.createElement('div');
        subtitleOptionsContainer.id = 'subtitle-options';
        subtitleOptionsContainer.className = 'option-container';
        subtitleOptionsContainer.style.display = 'none';
        sidebarList.insertBefore(subtitleOptionsContainer, sidebarList.children[2]);

    } catch (error) {
        console.error('初始化时发生错误:', error);
        alert('页面加载时发生错误，请刷新页面或联系管理员');
    }
    
    // 更新字幕图块位置和宽度

});