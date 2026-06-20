'use strict';

LDR.Buttons = function(actions, element, addTopButtons, homeLink, mainImage, options) {
    let self = this;
    // Add buttons to element:
    this.dragging = false
    this.actions = actions
    this.posX;
    // Camera buttons:
    this.cameraButtons = this.createDiv('camera_buttons');
    const boxCard = document.getElementById('main_canvas_header__right')
    this.cameraButtons.setAttribute('class', 'ui_control');
    this.zoomOutButtonLarge = this.createDiv('zoom_out_button_large', actions.zoomOut);
    this.zoomOutButtonLarge.appendChild(LDR.SVG.makeZoom(false, 2));
    this.cameraButtons.appendChild(this.zoomOutButtonLarge);
    this.resetCameraButton = this.createDiv('iconFoldup', actions.resetCameraPosition);
    this.resetCameraButton.appendChild(LDR.SVG.makeCamera(50, 45, 100));
    boxCard.appendChild(this.resetCameraButton);
    this.zoomInButton = this.createDiv('zoom_in_button', actions.zoomIn);
    this.zoomInButton.appendChild(LDR.SVG.makeZoom(true, 1));
    this.cameraButtons.appendChild(this.zoomInButton);
    this.zoomOutButton = this.createDiv('zoom_out_button', actions.zoomOut);
    this.zoomOutButton.appendChild(LDR.SVG.makeZoom(false, 1));
    this.cameraButtons.appendChild(this.zoomOutButton);
    this.zoomInButtonLarge = this.createDiv('zoom_in_button_large', actions.zoomIn);
    this.zoomInButtonLarge.appendChild(LDR.SVG.makeZoom(true, 2));
    this.cameraButtons.appendChild(this.zoomInButtonLarge);
    element.appendChild(this.cameraButtons);
    // Back button:
    if(actions.prevStep) {
        this.backButton = this.createDiv('prev_button', actions.prevStep);

        if(!addTopButtons) {
            element.appendChild(this.backButton);
        }
    }

    // Right lower corner buttons:
    if(actions.nextStep) {
        this.nextButton = this.createDiv('next_button', actions.nextStep);
        if(!addTopButtons) {
            element.appendChild(this.nextButton);
        }
    }

    if(addTopButtons) {
	this.addTopButtonElements(actions, element, homeLink, mainImage, options);
    }

    this.hideElementsAccordingToOptions();

    this.fadeOutHandle;
    let fadeOut = function() {
	self.fadeOutHandle = null;
	$('.ui_control').fadeTo(1000, 0);
    }
    let onFadeInComplete = function() {
        self.fadeOutHandle = setTimeout(fadeOut, 1000);
    }
    fadeOut();

    let runUIFading = function() {
        $('.ui_control').stop(); // Stop fade out.
	if(self.fadeOutHandle) {
	    clearTimeout(self.fadeOutHandle);
        }
	self.fadingIn = true;
	$('.ui_control').css('opacity', 1);
        onFadeInComplete();
    };
    $("#main_canvas, #preview, #next_button_large, #next_button, .ui_control").mousemove(runUIFading);
    $(".ui_control").on('tap', runUIFading);
}

LDR.Buttons.prototype.addTopButtonElements = function(actions, element, homeLink, mainImage, options) {
    // Upper row of buttons (added last due to their absolute position):
    // this.topButtons = this.createDiv('top_buttons');
    this.topButtons = this.createDiv('top_buttons');

    this.backButton.setAttribute('class', 'top_button backButton-style');
    this.topButtons.appendChild(this.backButton);

    this.stepToButton = this.createDiv('stepToContainer');
    this.stepToButton.appendChild(this.makeStepTo());

    // 调整位置
    $('#jdtDic').append(this.stepToButton)
    // this.topButtons.appendChild(this.stepToButton);

    if(options.showNumberOfSteps) {
	let stepsEle = this.createDiv('numberOfSteps');
    $('#jdtDic').append(stepsEle)
    }

    if(mainImage) {
	let img = document.createElement('img');
	img.setAttribute('src', mainImage);
    }

    // Edit:
    if(options.canEdit) {
        let editButton = this.createDiv('editButton');
        editButton.appendChild(LDR.SVG.makeEdit());
        editButton.addEventListener('click', actions.toggleEditor);
        this.topButtons.appendChild(editButton);
    }

    this.nextButton.setAttribute('class', 'top_button backButton-style');
    this.topButtons.appendChild(this.nextButton);

    // element.appendChild(this.topButtons);
    $('#dbPage').append(this.topButtons)
    $('#prev_button').append(`<p>上一步`)
    $('#next_button').append(`<p>下一步`)
    // element.appendChild(this.topButtons);
}

LDR.Buttons.prototype.hideElementsAccordingToOptions = function() {
    if(LDR.Options.showCameraButtons == 2) {
    }
    else if(LDR.Options.showCameraButtons == 0) {
    }
    else {
    }
}

// Step to input field:
LDR.Buttons.prototype.makeStepTo = function() {
    this.stepInput = document.createElement("input");
    this.stepInput.setAttribute("id", "pageNumber");
    this.stepInput.setAttribute("onClick", "this.select();");
    return this.stepInput;
}

// Primitive helper methods for creating elements for buttons:
LDR.Buttons.prototype.createDiv = function(id, onclick, classA) {
    return this.create('div', id, onclick, classA);
}
LDR.Buttons.prototype.create = function(type, id, onclick, classA) {
    let ret = document.createElement(type);
    ret.setAttribute('id', id);
    if(onclick) {
	let semaphore = false;
        ret.addEventListener('mouseup', e => {if(!semaphore){onclick(e);}semaphore=false;});
	ret.addEventListener('touchend', e => {semaphore=true;onclick(e);});
    }
    if(classA) {
        ret.setAttribute('class', classA);
    }
    return ret;
}

// Functions for hiding next/prev buttons:

// 第一步
LDR.Buttons.prototype.atFirstStep = function() {
    console.log('步骤开始')

    // 上一步的按钮样式
    this.backButton.style.visibility = 'visible';
    this.backButton.classList.add("prev_next_disabled");

    // 下一步的按钮样式
    this.nextButton.style.visibility = 'visible';
    this.nextButton.classList.remove("prev_next_disabled");

    if(this.doneButton) {
        this.doneButton.style.visibility = 'hidden';
    }
}

// 最后一步
LDR.Buttons.prototype.atLastStep = function() {
    console.log('步骤结束')

    // 上一步的按钮样式
    this.backButton.style.visibility = 'visible';
    this.backButton.classList.remove("prev_next_disabled");

    // 下一步的按钮样式
    this.nextButton.style.visibility = 'visible';
    this.nextButton.classList.add("prev_next_disabled");

    var alertBox = document.getElementById('alertBox');
    alertBox.style.display = 'block';
    setTimeout(function () {
        alertBox.style.display = 'none';
    }, 3000);
    if(this.doneButton) {
        this.doneButton.style.visibility = 'visible';
    }
}

// 步骤进行中
LDR.Buttons.prototype.atAnyOtherStep = function() {
    console.log('步骤进行中')

    // 上一步的按钮样式
    this.backButton.style.visibility = 'visible';
    this.backButton.classList.remove("prev_next_disabled");

    // 下一步的按钮样式
    this.nextButton.style.visibility = 'visible';
    this.nextButton.classList.remove("prev_next_disabled");

    if(this.doneButton) {
        this.doneButton.style.visibility = 'hidden';
    }
}

// 拖动进度条
LDR.Buttons.prototype.moveProgressStep = function (step) {
    const dragItem = document.getElementById('bar');
    const _that = this;
    const mousedownFn = function (e) {
        _that.dragging = true;
        const domBoxX = e.clientX || e.touches[0].clientX || 0
        _that.posX = domBoxX - parseInt(window.getComputedStyle(dragItem).left, 10);
        document.documentElement.style.userSelect = 'none';
        document.documentElement.style.mozUserSelect = 'none';
        document.documentElement.style.webkitUserSelect = 'none';
        dragItem.onselectstart = function () { return false; };
    }
    const mousemoveFn = function (e) {
        if (_that.dragging) {

            const domBoxX = e.clientX || e.touches[0].clientX || 0

            const barX = (domBoxX - _that.posX);

            const progressBoxW = document.getElementById('progress').offsetWidth || 0

            if (Number(barX)  <0) return
            if (Number(barX) > progressBoxW) return
            dragItem.style.left = barX + 'px';
            document.getElementById('progress_pill').style.width = barX + 'px';
        }
    }

    const mouseupFn = function () {
        if (_that.dragging) {
            const barX = dragItem.style.left.match(/\d+/);
            const progressBoxW = document.getElementById('progress').offsetWidth || 0
            const totalPage = document.getElementById('numberOfSteps').innerHTML.match(/\d+/);
            const stepW = Math.floor(progressBoxW / totalPage[0])
            const currentStep = Math.trunc((Number(barX[0]) + stepW - 1) / stepW)
            const movePage = Number(currentStep)
            _that.actions.moveTo(movePage)
            _that.actions.handleStepsWalked()

        }
        _that.dragging = false;
        document.addEventListener('mousemove', mousemoveFn);
        document.documentElement.style.userSelect = 'auto';
        document.documentElement.style.mozUserSelect = 'auto';
        document.documentElement.style.webkitUserSelect = 'auto';
        dragItem.onselectstart = function () { return true; };
    }
    dragItem.addEventListener('mousedown', mousedownFn);
    document.addEventListener('mousemove', mousemoveFn);
    document.addEventListener('mouseup', mouseupFn);
    // 兼容手机端
    dragItem.addEventListener('touchstart', mousedownFn);
    document.addEventListener('touchmove', mousemoveFn);
    document.addEventListener('touchend', mouseupFn);
}
LDR.Buttons.prototype.setShownStep = function(step) {

    // 更新进度条
    function changeProcess(step){
        const progress = document.getElementById('progress')
        const progress_pill = document.getElementById('progress_pill')
        const bar = progress.children[1]
        const totalPage = document.getElementById('numberOfSteps').innerHTML.match(/\d+/);
        const moveWidth = progress.offsetWidth * (step / totalPage)
        bar.style.left = moveWidth + 'px'
        progress_pill.style.width = moveWidth + 'px'
    }
    this.stepInput.value = ""+step;
    changeProcess(step)

    // 更新页码展示
    function changeCurrentStepShow(step){
        $('#current_step').html(step);
        console.log('current step:' + step)
    }
    changeCurrentStepShow(step)
}

// 原新手教程，现已改为预览
// LDR.Buttons.prototype.openBeginnerTutorial = () => $('.main_canvas_header__left').unbind().on('click',() => {
//     var img = new Image();
//     img.src = '/img/title_left.png';
//     var height = img.height/1.6; 
//     var width = img.width/1.6;
//     var imgHtml = "<img src='" + img.src + "' style='width: " + width + "px;height:" + height + "px'/>";
//     layer.open({
//         type: 1 
//         , title: '新手教程'
//         , area: [width + 'px', (height + 42) + 'px']
//         , shade: 0.3
//         , maxmin: true
//         , shadeClose: true // 点击遮罩层关闭弹出层
//         , closeBtn: 0
//         , content: imgHtml
//         , zIndex: layer.zIndex //重点1
//     });

// })

// 预览
LDR.Buttons.prototype.openBeginnerTutorial = () => $('.main_canvas_header__left').unbind().on('click',() => {
    $('#image-round').click();  // 模拟点击预览按钮
})

// 预览
LDR.Buttons.prototype.setShownPreView = () => $('#image-round').unbind().on('click',() => {

    const imgScr =$('#imageRoundImage').attr('src')
    console.log('imgScr:', imgScr)
    const viewHtml = `<img src="${imgScr}" width="100%" >`

    // const viewHtml = '<canvas id="testView" style="border-radius: 10px 10px 0px 0px; width: 312px; height: 675.2px;" width="936" height="2025"></canvas>'

    layer.open({
        type: 1 //此处以iframe举例
        ,title: '预览'
        ,area: ['364px', '60%']
        ,shade: 0.3
        ,maxmin: true
        ,shadeClose: true // 点击遮罩层关闭弹出层
        ,closeBtn:0
        ,content: viewHtml
        ,zIndex: layer.zIndex //重点1
    });

})

// 色卡
LDR.Buttons.prototype.setShownColorView = () => $('#image-color').unbind().on('click',() => {

    const viewHtml = '<img src="/img/color.jpg" width="100%" height="100%">'

    layer.open({
        type: 1 //此处以iframe举例
        ,title: '预览'
        ,area: ['300px', '300px']
        ,shade: 0.3
        ,closeBtn:0
        ,maxmin: true
        ,shadeClose: true // 点击遮罩层关闭弹出层
        ,content: viewHtml
        ,zIndex: layer.zIndex //重点1
    });

})

