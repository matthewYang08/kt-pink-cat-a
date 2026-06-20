'use strict';

LDR = LDR || {};

LDR.PLIBuilder = function(loader, showEditor, mainModelID, canvas, renderer) {
    this.loader = loader;
    this.showEditor = showEditor;
    this.canvas = canvas;
    this.renderer = renderer;
    this.fillHeight = false;
    this.groupParts = true;
    this.clickMap;


    // Register for options changes:
    let self = this;
    if(LDR.Options) {
        LDR.Options.listeners.push(function() {
                if(self.lastStep) {
                    self.drawPLIForStep(self.fillHeight, self.lastStep,
                                        self.lastMaxWidth, self.lastMaxHeight, 0, true);
                }
            });
    }

    // Set up rendering elements:
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000000);
    this.camera.position.set(10000, 7000, 10000);
    this.camera.lookAt(new THREE.Vector3());
    this.measurer = new LDR.Measurer(this.camera);
    this.scene = new THREE.Scene(); // Will only contain one element at a time.
}

LDR.PLIBuilder.prototype.getPartType = function(id) {
    let pt = this.loader.getPartType(id);
    if(!pt.mesh) { // Ensure size is computed.
	pt.mesh = new THREE.Group();
	let opaqueObject = new THREE.Group();
	let sixteenObject = new THREE.Group();
	let transObject = new THREE.Group();
	pt.mesh.add(opaqueObject);
	pt.mesh.add(sixteenObject);
	pt.mesh.add(transObject);

        // Set up mesh collector:
	pt.pliMC = new LDR.MeshCollector(opaqueObject, sixteenObject, transObject);
	let p = new THREE.Vector3();
	let r = new THREE.Matrix3(); r.set(1,0,0, 0,-1,0, 0,0,-1);
	pt.generateThreePart(this.loader, 16, p, r, true, false, pt.pliMC);

        // Draw to ensure bounding box:
        pt.pliMC.draw(false);
	let elementCenter = new THREE.Vector3();
	let b = pt.pliMC.boundingBox;
	b.getCenter(elementCenter);
	pt.mesh.position.sub(elementCenter);

	let [width,height,linesBelow,linesAbove] = this.measurer.measureConvexHull(b, pt.mesh.matrixWorld);
	pt.dx = width;
	pt.dy = height;
        pt.linesBelow = linesBelow;
        pt.linesAbove = linesAbove;
    }
    return pt;
}

LDR.PLIBuilder.prototype.updateCamera = function(w, h) {
    this.camera.left = -w*0.51;
    this.camera.right = w*0.51;
    this.camera.top = h*0.51;
    this.camera.bottom = -h*0.51;
    this.camera.updateProjectionMatrix();
}

LDR.PLIBuilder.prototype.renderIcon = function(partID, c, w, h) {
    let pt = this.getPartType(partID);

    pt.pliMC.overwriteColor(c);
    pt.pliMC.draw(false);

    this.scene.add(pt.mesh);

    this.renderer.setSize(w+1, h+1); // +1 to ensure edges are in frame in case of rounding down.
    this.updateCamera(pt.dx, pt.dy);

    let composer = new THREE.EffectComposer(this.renderer);
    if(pt.pliMC.attachGlowPasses(w, h, this.scene, this.camera, composer)) {
        composer.addPass(new THREE.RenderPass(this.scene, this.camera));
        composer.render();
    }
    else {
        this.renderer.render(this.scene, this.camera);
    }

    this.scene.remove(pt.mesh);
}

LDR.PLIBuilder.prototype.createClickMap = function(step) {
    let icons = {}; // key -> {key, partID, c, mult, desc}, key='part_id'_'color_id'
    this.clickMap = [];
    for(let i = 0; i < step.subModels.length; i++) {
	let dat = step.subModels[i];
	if(this.groupParts && dat.REPLACEMENT_PLI === true) {
	    continue; // Do not show replaced part.
	}
	let partID = (this.groupParts && dat.REPLACEMENT_PLI) ? dat.REPLACEMENT_PLI : dat.ID;
	let partType = this.loader.getPartType(partID);
        if(!partType) {
            continue; // Part not loaded
        }
	let c = dat.c;
	let key = partID.endsWith('.dat') ? partID.substring(0, partID.length-4) : partID;
	let pliID = key;

	// Check if there is special PLI information for this part:
	if(LDR.PLI && LDR.PLI.hasOwnProperty(pliID)) {
	    let pliInfo = LDR.PLI[pliID];
	    partID = "pli_" + partType.ID;
	    if(!this.loader.partTypes.hasOwnProperty(partID)) {
		let r = new THREE.Matrix3();
		r.set(pliInfo[0], pliInfo[1], pliInfo[2],
		      pliInfo[3], pliInfo[4], pliInfo[5],
		      pliInfo[6], pliInfo[7], pliInfo[8]);
		let step = new THREE.LDRStep();
		step.addSubModel(new THREE.LDRPartDescription(16, new THREE.Vector3(), r,
							      partType.ID, true, false));
		let pt = new THREE.LDRPartType(); // Potentially rotated PLI.
		pt.ID = partID;
		pt.modelDescription = partType.modelDescription;
		pt.author = partType.author;
		pt.license = partType.license;
		pt.inlined = partType.inlined;
                pt.isPart = partType.isPart;
		pt.steps.push(step);
		this.loader.partTypes[partID] = pt;
	    }
	    dat.ID = partID;
	}

	key += '_' + c;
	let icon = icons[key];
        if(this.groupParts && icon) {
            icon.mult++;
	}
	else {
	    let pt = this.getPartType(partID);
	    let b = pt.pliMC.boundingBox;
	    icon = {key: key,
		    partID: partID,
		    c: c,
            mult: 1,
		    desc: pt.modelDescription,
		    annotation: LDR.Annotations ? LDR.Annotations[pliID] : null,
		    dx: 60,
		    dy: 60,
            linesBelow: pt.linesBelow,
            linesAbove: pt.linesAbove,
		    size: 10,
		    inlined: pt.inlined,
            part: dat, // Used by editor.
		   };
	    icons[key] = icon;
	    this.clickMap.push(icon);
	}
    }

    let sorter = function(a, b) {
        if(a.dx != b.dx) {
            return a.dx < b.dx ? -1 : 1; // Sort by width.
        }

	let ca = a.desc;
	let cb = b.desc;
	if(ca !== cb) {
	    return ca < cb ? -1 : 1; // Group plates, bricks, etc. (Only works well when not also sorting by width above)
	}
	return a.c - b.c;
    }
    this.clickMap.sort(sorter);
}

LDR.PLIBuilder.prototype.drawPLIForStep = function(fillHeight, step, maxWidth, maxHeight, force) {
    function detectDevice() {
        var screenWidth = window.screen.width;
        var userAgent = navigator.userAgent || navigator.vendor || window.opera;
        if (screenWidth < 768) {
            return 'mobile';
        } else {
            if (/Mobile|Android|BlackBerry|IEMobile|iPhone|iPad|iPod|Opera Mini|Silk/i.test(userAgent)) {
                return 'mobile';
            }
            return 'desktop';
        }
    }

    function calculateSquareCoordinates(clickMapList, gap) {
        let coordinates = [];
        let currentX = 0; // 当前正方形的X坐标  
        let currentY = 0; // 当前正方形的Y坐标  
        let squaresPerRow = 9999; // 每行正方形数量
        const numSquares = clickMapList.length
        for (let i = 0; i < numSquares; i++) {
            clickMapList[i].DX = 114
            clickMapList[i].DY = 114
            clickMapList[i].FULL_DX = 114
            clickMapList[i].MULT_Y = 60
            const sideLength = clickMapList[i].DX * 0.5
            if (i % squaresPerRow === 0 && i > 0) {
                currentX = 0; 
                currentY += sideLength + gap;  
            }
            coordinates.push([currentX, currentY]);
            clickMapList[i]['x'] = currentX
            clickMapList[i]['y'] = currentY
            currentX += sideLength + gap;
        }
        if (numSquares % squaresPerRow !== 0) {
            coordinates[coordinates.length - 1][0] -= gap;
            clickMapList[coordinates.length - 1][0] -= gap;
        }  
        return {
            clickMapList: clickMapList,
            boxWidth: (clickMapList[clickMapList.length - 1].x) + 114
        };
    }

    let groupParts = !this.showEditor;
    // Ensure no re-draw if not necessary:
    if(!force &&
       this.lastStep && this.lastStep.idx === step.idx && this.groupParts === groupParts &&
       this.lastMaxWidth === maxWidth && this.lastMaxHeight === maxHeight &&
       this.fillHeight === fillHeight) {
	return;
    }

    const LOWER_LIMIT = 10;
    if(maxWidth < LOWER_LIMIT || maxHeight < LOWER_LIMIT) {
        this.canvas.style.display = 'none';
        return;
    }
    this.canvas.style.display = 'inline-block';

    this.groupParts = groupParts;
    this.fillHeight = fillHeight;
    this.lastStep = step;
    this.lastMaxWidth = maxWidth;
    this.lastMaxHeight = maxHeight;

    // Find, sort and set up icons to show:
    this.createClickMap(step);
    let textHeight = (!fillHeight ? maxHeight : maxWidth) / Math.sqrt(this.clickMap.length) * 0.19;
    let [W,H] = Algorithm.PackPlis(fillHeight, maxWidth-4, maxHeight-8, this.clickMap, 10);
    const boxWidth = calculateSquareCoordinates(this.clickMap, 10).boxWidth;
    const DPR = window.devicePixelRatio;
    this.canvas.width = boxWidth * DPR;
    this.canvas.style.width = boxWidth + "px";
    this.canvas.height = 80 * DPR;
    this.canvas.style.height = "80px";
    let context = this.canvas.getContext('2d');
    if(!context) {
        return;
    }

    const scaleDown = 0.3; // To make icons not fill out the complete allocated cells.
    let self = this;

    context.clearRect(0, 0, context.width, context.height);
    context.translate(6, 6);
    // Draw icon:
    for(let i = 0; i < self.clickMap.length; i++) {
	let icon = self.clickMap[i];
        let x = icon.x*DPR;
        let y = icon.y*DPR;
        let w = parseInt(icon.DX*scaleDown);
        let h = parseInt(icon.DY*scaleDown);

        context.fillStyle = '#fdfdfd';
        const xxx = (icon.y + icon.MULT_Y) * DPR - y
        context.fillRect(x, y, xxx, xxx); 
        const differenceValue = (icon.MULT_Y - w ) * DPR/2
        self.renderIcon(icon.partID, icon.c, w, h);
        context.drawImage(self.renderer.domElement, x + differenceValue, y + differenceValue);

        // Hack to ensure it works on Android:
        [w, h] = LDR.getScreenSize();
        this.renderer.setSize(w, h, true);
    }

    // Draw multipliers:
    context.fillStyle = "#000";
    context.lineWidth = "3";
    if(this.groupParts) {
        context.font = parseInt(12*DPR) + "px sans-serif";
        context.fillStyle = "black";
        function drawMultiplier(icon) {
            let h = textHeight * DPR;
            let x = icon.x * DPR;
            let y = (icon.y + icon.MULT_Y) * DPR;
            context.fillText(icon.mult + "x", x, icon.y * DPR + parseInt(12 * DPR));
            context.fillText(LDR.Colors[icon.c].name, x, y) 
        }
        this.clickMap.forEach(drawMultiplier);
    }
    // Draw Annotation:
    context.font = parseInt(textHeight*0.8*DPR) + "px monospace";
    this.clickMap.filter(icon => icon.annotation).forEach(icon => {
	let len = icon.annotation.length;
	let x = (icon.x+icon.FULL_DX+1)*DPR;
	let y = (icon.y+icon.ANNO_Y)*DPR;
	let w = (len*textHeight*0.54)*DPR;
	let h = textHeight*DPR;
	context.beginPath();
	context.fillStyle = "#CFF";
	if(icon.desc && icon.desc.startsWith('Technic Axle')) {
	    context.arc(x+w*0.45, y+h*0.55, h*(0.15 + len*0.18), 0, 2*Math.PI, false);
        }
	else {
	    context.rect(x, y, w, h);
        }
	context.fill();
	context.stroke();
	context.fillStyle = "#25E";
	y += textHeight*DPR*0.79;
	context.fillText(icon.annotation, x, y);
    });
    // Draw highlight for ghosted parts:
    if(this.showEditor) {
        context.strokeStyle = "#5DD";
        context.lineWidth = '4';
	let hoveredIcon = null;
        this.clickMap.forEach(icon => {
            if(icon.part.original.ghost) {
                let x = parseInt((icon.x)*DPR);
                let y = parseInt((icon.y)*DPR);
                let w = parseInt((icon.DX)*DPR);
                let h = parseInt((icon.DY)*DPR);
                context.strokeRect(x, y, w, h);
            }
	    if(icon.part.original.hover) {
		hoveredIcon = icon;
	    }
        });
	if(hoveredIcon) {
	    context.strokeStyle = "#000";
	    context.setLineDash([10, 10]);
	    this.clickMap.forEach(icon => {
                let x = parseInt((hoveredIcon.x)*DPR);
                let y = parseInt((hoveredIcon.y)*DPR);
                let w = parseInt((hoveredIcon.DX)*DPR);
                let h = parseInt((hoveredIcon.DY)*DPR);
                context.strokeRect(x, y, w, h);
            });
	}
    }
}
