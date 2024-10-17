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
        const subtitleContainer = document.getElementById('subtitle-container');
        const timeMarkersContainer = document.getElementById('time-markers');


        if (!form || !fileInput || !message || !downloadButton || !progressBar || !previewContainer || !previewVideo || !timeline || !currentTime || !totalTime ) {
            throw new Error('One or more required DOM elements are missing');
        }


        let currentSpeed = 1; // 當前速度
        let currentVolume = 1; // 當前音量
        let originalVideo = null; // 用於存儲原始視頻文件名
        let processedVideo = null; // 用於存儲處理後的視頻文件名
        let previewVideoUrl = null; // 用於存儲預覽視頻的 URL


        // 格式化時間,將秒數轉換為分:秒格式
        function formatTime(timeInSeconds) {
            const minutes = Math.floor(timeInSeconds / 60);
            const seconds = Math.floor(timeInSeconds % 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        function updateTimeMarkers(duration) {
            const subtitleContainer = document.getElementById('subtitle-container');
            subtitleContainer.innerHTML = ''; // 清空現有的時間標記和字幕塊
            const interval = duration / 10; // 每10%添加一個標記
            for (let i = 0; i <= 10; i++) {
                const time = interval * i;
                const marker = document.createElement('div');
                marker.className = 'time-marker';
                marker.style.left = `${(time / duration) * 100}%`;
                marker.textContent = formatTime(time);
                subtitleContainer.appendChild(marker);
            }
        }
        function updateSubtitleBlocks() {
            const subtitleContainer = document.getElementById('subtitle-container');
            // 不清空容器，因為時間標記已經在裡面了
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
            updateSubtitleBlocks(); // 在更新時間標記後更新字幕塊
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

        // 當用戶選擇文件時,重置所有相關變量
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // 重置所有相關變量
                previewVideoUrl = URL.createObjectURL(file);
                originalVideo = file.name;
                processedVideo = null;
                currentSpeed = 1;
                currentVolume = 1;
                originalSpeed = 1;
                originalVolume = 1;

                // 重置UI
                downloadButton.style.display = 'none';
                message.textContent = '';
                form.style.display = 'block'; // 顯示上傳表單
                
                // 移除"如需重新剪輯"的消息（如果存在）
                const resetMessage = document.querySelector('p[style="color: blue;"]');
                if (resetMessage) {
                    resetMessage.remove();
                }
                
                // 更新預覽視頻
                updatePreviewVideo();
                

                // 重置速度選項
                const speedOptionsContainer = document.getElementById('speed-options');
                speedOptionsContainer.style.display = 'none';
                speedOptionsContainer.innerHTML = '';

                // 重置進度條
                progressBar.style.display = 'none';
                progressBar.value = 0;

                // 發送文件到後端
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
                        console.log('文件信息已保存到後端:', data.message);
                    } else {
                        console.error('保存文件信息失敗:', data.error);
                    }
                })
                .catch(error => {
                    console.error('保存文件信息時發生錯誤:', error);
                });

                console.log('文件已選擇:', originalVideo);
                subtitles = []; // 清空字幕數組
            }
        });

        // 更新預覽視頻的源和播放狀態
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
                showErrorModal('Please upload the video first.');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('speed', currentSpeed);

            // 顯示加載覆蓋層
            const loadingOverlay = document.getElementById('loading-overlay');
            const loadingMessage = document.getElementById('loading-message');
            loadingMessage.textContent = 'Video is being uploaded and processed, please wait...';
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
                    showErrorModal(result.error);
                    progressBar.style.display = 'none';
                    loadingOverlay.style.display = 'none';
                }
            } catch (error) {
                console.error('error:', error);
                showErrorModal('An error occurred while uploading the file');
                progressBar.style.display = 'none';
                loadingOverlay.style.display = 'none';
            }
        });

        // 修改 checkProgress 函數
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
                        

                        // 隱藏加載覆蓋層
                        document.getElementById('loading-overlay').style.display = 'none';
                    } else {
                        throw new Error('Invalid progress value');
                    }
                })
                .catch(error => {
                    console.error('An error occurred while checking progress:', error);
                    message.textContent = 'An error occurred while checking progress: ' + error.message;
                    message.style.color = 'red';
                    progressBar.style.display = 'none';
                    // 隱藏加載覆蓋層
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

        // 調整音量功能
        function adjustVolume() {
            if (!originalVideo) {
                showErrorModal('Please upload the video first and then adjust the volume.');
                return;
            }

            const volumeOptionsContainer = document.getElementById('volume-options');
            
            // 切換音量選項的顯示狀態
            volumeOptionsContainer.style.display = volumeOptionsContainer.style.display === 'none' ? 'block' : 'none';

            // 如果是顯示狀態，創建音量滑塊
            if (volumeOptionsContainer.style.display === 'block') {
                volumeOptionsContainer.innerHTML = ''; // 清空現有的選項
                
                const volumeSlider = document.createElement('input');
                volumeSlider.type = 'range';
                volumeSlider.min = 0;
                volumeSlider.max = 200;
                volumeSlider.value = currentVolume * 100;
                volumeSlider.step = 1;
                volumeSlider.classList.add('volume-slider');

                const volumeLabel = document.createElement('span');
                volumeLabel.textContent = `${currentVolume * 100}%`;
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

        // 修改 applyVolumeChange 函數
        function applyVolumeChange(volume) {
            currentVolume = volume;
            
            fetch('/adjust_volume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input_file: originalVideo,
                    volume: volume,
                    speed: currentSpeed, // 同時應用當前速度
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
                    processedVideo = data.output_file;
                    updatePreviewAndDownload(processedVideo);
                } else {
                    throw new Error(data.error || 'Failed to adjust video volume');
                }
            })
            .catch(error => {
                console.error('An error occurred while adjusting video volume:', error);
                showErrorModal('An error occurred while adjusting video volume: ' + error.message);
            });
        }

        // 調整播放速度功能
        function adjustSpeed() {
            if (!originalVideo) {
                showErrorModal('Please upload your video first and then adjust the speed.');
                return;
            }

            const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
            const speedOptionsContainer = document.getElementById('speed-options');
            
            // 切換速度選項的顯示狀態
            speedOptionsContainer.style.display = speedOptionsContainer.style.display === 'none' ? 'block' : 'none';

            // 如果是顯示狀態，創建速度選項按鈕
            if (speedOptionsContainer.style.display === 'block') {
                speedOptionsContainer.innerHTML = ''; // 清空現有的選項
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
                showErrorModal('Please upload your video first and then adjust the speed.');
                return;
            }

            currentSpeed = speed;
            updateSpeedButtons();
            adjustVideoSpeed(speed);
        }
        // 更新速度按鈕的選中狀態
        function updateSpeedButtons() {
            const speedButtons = document.querySelectorAll('.speed-option');
            speedButtons.forEach(button => {
                const buttonSpeed = parseFloat(button.textContent);
                if (buttonSpeed === currentSpeed) {
                    button.classList.add('selected');
                } else {
                    button.classList.remove('selected');
                }
            });
        }
        // 修改 adjustVideoSpeed 函數
        function adjustVideoSpeed(speed) {
            currentSpeed = speed;

            fetch('/adjust_speed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input_file: originalVideo,
                    speed: speed,
                    volume: currentVolume, 
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
                    processedVideo = data.output_file;
                    updatePreviewAndDownload(processedVideo);
                } else {
                    throw new Error(data.error || 'Failed to adjust video speed');
                }
            })
            .catch(error => {
                console.error('Failed to adjust video speed:', error);
                showErrorModal('Failed to adjust video speed: ' + error.message);
            });
        }

        // 修改 updatePreviewAndDownload 函數
        function updatePreviewAndDownload(videoFile) {
            previewVideoUrl = `/preview/${videoFile}`;
            previewVideo.src = previewVideoUrl;
            previewVideo.load();
            previewVideo.play();
            
            downloadButton.onclick = () => {
                window.location.href = `/download/${videoFile}`;
            };
            downloadButton.style.display = 'block';
        }

        // 添加字幕功能
        function addSubtitle() {
            if (!originalVideo) {
                showErrorModal('Please upload your video first and then add subtitles.');
                return;
            }

            const subtitleOptionsContainer = document.getElementById('subtitle-options');
        
            // 切換字幕選項的顯示狀態
            subtitleOptionsContainer.style.display = subtitleOptionsContainer.style.display === 'none' ? 'block' : 'none';

            // 如果是顯示狀態，創建字幕輸入表單
            if (subtitleOptionsContainer.style.display === 'block') {
                subtitleOptionsContainer.innerHTML = `
                    <input type="text" id="start-time" placeholder="Start Time (sec)" class="time-input">
                    <input type="text" id="end-time" placeholder="End Time (sec)" class="time-input">
                    <textarea id="subtitle-text" placeholder="Enter subtitle text" class="subtitle-input"></textarea>
                    <button id="submit-subtitle">Add Subtitle</button>
                    <div id="subtitle-list"></div>
                `;

                // 使用函數來設置事件監聽器
                setupSubmitSubtitleListener();

                updateSubtitleList();
            }

            function setupSubmitSubtitleListener() {
                const submitButton = document.getElementById('submit-subtitle');
                submitButton.onclick = () => {
                    const startTime = document.getElementById('start-time').value;
                    const endTime = document.getElementById('end-time').value;
                    const subtitleText = document.getElementById('subtitle-text').value;
                    submitSubtitle(subtitleText, startTime, endTime);
                };
            }

            function submitSubtitle(text, startTime, endTime) {
                const newSubtitle = {
                    text: text,
                    startTime: parseFloat(startTime),
                    endTime: parseFloat(endTime)
                };
                subtitles.push(newSubtitle);
                updateSubtitleList();
                updateSubtitleBlocks();
                applySubtitlesToVideo();
                resetSubtitleForm();
                // 重新設置事件監聽器
                setupSubmitSubtitleListener();
            }

           
        }
        function resetSubtitleForm() {
                        document.getElementById('start-time').value = '';
                        document.getElementById('end-time').value = '';
            document.getElementById('subtitle-text').value = '';
        }
        function editSubtitle(index) {
            const subtitle = subtitles[index];
            document.getElementById('start-time').value = subtitle.startTime;
            document.getElementById('end-time').value = subtitle.endTime;
            document.getElementById('subtitle-text').value = subtitle.text;
            document.getElementById('submit-subtitle').textContent = 'Update Subtitle';
            document.getElementById('submit-subtitle').onclick = () => {
                const startTime = document.getElementById('start-time').value;
                const endTime = document.getElementById('end-time').value;
                const subtitleText = document.getElementById('subtitle-text').value;

                updateSubtitle(index, subtitleText, startTime, endTime);
            };
        }

        function updateSubtitle(index, text, startTime, endTime) {
            subtitles[index] = {
                text: text,
                startTime: parseFloat(startTime),
                endTime: parseFloat(endTime)
            };
            updateSubtitleList();
            updateSubtitleBlocks();
            applySubtitlesToVideo();
            resetSubtitleForm();
            // 重置提交按鈕
            document.getElementById('submit-subtitle').textContent = 'Add Subtitle';
        }

        function updateSubtitleList() {
            const subtitleList = document.getElementById('subtitle-list');
            subtitleList.innerHTML = '';
            subtitles.forEach((subtitle, index) => {
                const subtitleItem = document.createElement('div');
                subtitleItem.className = 'subtitle-item';
                subtitleItem.innerHTML = `
                    <span>${formatTime(subtitle.startTime)} - ${formatTime(subtitle.endTime)}: ${subtitle.text}</span>
                    <button onclick="editSubtitle(${index})">Edit</button>
                    <button onclick="deleteSubtitle(${index})">Delete</button>
                `;
                subtitleList.appendChild(subtitleItem);
            });
        }

        function deleteSubtitle(index) {
            subtitles.splice(index, 1);
            updateSubtitleList();
            updateSubtitleBlocks();
            applySubtitlesToVideo();
        }

        function applySubtitlesToVideo() {
            let inputFile = originalVideo;

            // 顯示加載指示器
            document.getElementById('loading-overlay').style.display = 'flex';

            fetch('/update_subtitles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input_file: inputFile,
                    subtitles: subtitles,
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
                    // 更新預覽視頻為新的帶字幕視頻
                    previewVideo.src = `/preview/${data.output_file}?t=${new Date().getTime()}`; // 添加時間戳以避免緩存
                    previewVideo.load();
                    previewVideo.play();
                    
                    // 更新下載按鈕鏈接
                    downloadButton.onclick = () => {
                        window.location.href = `/download/${data.output_file}`;
                    };
                    downloadButton.style.display = 'block';
                    

                    currentSubtitleFile = data.output_file;
                } else {
                    throw new Error(data.error || 'Failed to apply subtitles');
                }
            })
            .catch(error => {
                console.error('Failed to apply subtitles:', error);
                showErrorModal('Failed to apply subtitles: ' + error.message);
            })
            .finally(() => {
                // 隱藏加載指示器
                document.getElementById('loading-overlay').style.display = 'none';
            });
        }

        // 添加這行來獲取所有側邊欄按鈕
        const sidebarButtons = document.querySelectorAll('.sidebar-btn');

        // 為每個側邊欄按鈕添加點擊事件監聽器
        sidebarButtons.forEach(button => {
            button.addEventListener('click', handleSidebarButtonClick);
        });

        // 創建音量選項容器
        const sidebarList = document.querySelector('.sidebar ul');
        const volumeOptionsContainer = document.createElement('div');
        volumeOptionsContainer.id = 'volume-options';
        volumeOptionsContainer.className = 'option-container';
        volumeOptionsContainer.style.display = 'none';
        sidebarList.insertBefore(volumeOptionsContainer, sidebarList.children[1]);

        // 創建字幕選項容器
        const subtitleOptionsContainer = document.createElement('div');
        subtitleOptionsContainer.id = 'subtitle-options';
        subtitleOptionsContainer.className = 'option-container';
        subtitleOptionsContainer.style.display = 'none';
        sidebarList.insertBefore(subtitleOptionsContainer, sidebarList.children[4]);

        // 添加這個新函數來顯示錯誤彈窗
        function showErrorModal(errorMessage) {
            const modal = document.createElement('div');
            modal.className = 'error-modal';
            modal.innerHTML = `
                <div class="error-modal-content">
                    <h2>Error</h2>
                    <p>${errorMessage}</p>
                    <button onclick="this.parentElement.parentElement.remove()">Close</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // 確保這個函數在全局範圍內定義
        window.editSubtitle = editSubtitle;
        window.deleteSubtitle = deleteSubtitle;


    } catch (error) {
        showErrorModal('Initialization error: ' + error.message);
    }
    

});
