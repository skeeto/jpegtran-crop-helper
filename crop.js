const aspects = [
    {w: 0,  h: 0},
    {w: 1,  h: 1},
    {w: 16, h: 9},
    {w: 4,  h: 3},
    {w: 3,  h: 2}
];

document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    let canvas = document.getElementById('photo')
    let command = document.getElementById('command')

    let ctx = canvas.getContext('2d');
    let image = null;
    let position = {w: 0, h: 0, x: 0, y: 0};
    let crop = {x0: 0, y0: 0, x1: 1.0, y1: 1.0};
    let handleSize = 32;
    let handles = null;
    let active = null;
    let cropStart = null;
    let dragStart = null;
    let aspect = 0;
    let aspectChanged = false;
    let filename = 'input.jpg';

    draw();

    function draw() {
        ctx.globalAlpha = 1.0;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!image) {
            let s = '[drag and drop image here]';
            ctx.font = '30px sans-serif';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(s, canvas.width / 2, canvas.height / 2);
            return;
        }

        let ca = canvas.width / canvas.height;
        let ia = image.width / image.height;
        if (ia < ca) {
            position.w = canvas.height * ia;
            position.h = canvas.height;
            position.x = (canvas.width - position.w) / 2;
            position.y = 0;
        } else {
            position.w = canvas.width;
            position.h = canvas.width / ia;
            position.x = 0;
            position.y = (canvas.height - position.h) / 2;
        }
        ctx.drawImage(image, position.x, position.y, position.w, position.h);

        let cx0 = crop.x0 * position.w + position.x;
        let cy0 = crop.y0 * position.h + position.y;
        let cx1 = (crop.x1 - crop.x0) * position.w + cx0;
        let cy1 = (crop.y1 - crop.y0) * position.h + cy0;
        let cw = (crop.x1 - crop.x0) * position.w;
        let ch = (crop.y1 - crop.y0) * position.h;

        ctx.fillStyle = 'black';
        ctx.globalAlpha = 0.60;
        ctx.fillRect(position.x, position.y, position.w, cy0 - position.y);
        ctx.fillRect(position.x, cy1, position.w, position.h + position.y - cy1);
        ctx.fillRect(position.x, cy0, cx0 - position.x, cy1 - cy0);
        ctx.fillRect(cx1, cy0, position.x + position.w - cx1, cy1 - cy0);

        ctx.lineWidth = 1;
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = active === 4 ? '#0ff' : '#66f';
        ctx.strokeRect(cx0, cy0, cw, ch);
        handles = [
            {x: cx0, y: cy0, w: +handleSize, h: +handleSize},
            {x: cx1, y: cy0, w: -handleSize, h: +handleSize},
            {x: cx0, y: cy1, w: +handleSize, h: -handleSize},
            {x: cx1, y: cy1, w: -handleSize, h: -handleSize},
        ];
        for (let i = 0; i < handles.length; i++) {
            let h = handles[i];
            ctx.strokeStyle = active === i ? '#0ff' : '#66f';
            ctx.strokeRect(h.x, h.y, h.w, h.h);
        }

        command.textContent = 'jpegtran -copy all -crop ' +
            Math.round(image.width * (crop.x1 - crop.x0)) + 'x' +
            Math.round(image.height * (crop.y1 - crop.y0)) + '+' +
            Math.round(image.width * crop.x0) + '+' +
            Math.round(image.height * crop.y0) +
            ' -outfile output.jpg ' + filename;

        if (aspectChanged) {
            aspectChanged = false;
            let a = aspects[aspect];
            let s = a.w === 0 ? 'none' : a.w + ':' + a.h;
            let p = 10;
            ctx.font = '60px bold sans-serif';
            ctx.fillStyle = 'white';
            ctx.fillText(s, position.x + p, position.y + position.h - p);
        }
    }

    function findHandle(x, y) {
        for (let i = 0; handles && i < handles.length; i++) {
            let h = handles[i];
            let x0 = h.x;
            let y0 = h.y;
            let x1 = h.x + h.w;
            let y1 = h.y + h.h;
            let minx = Math.min(x0, x1);
            let miny = Math.min(y0, y1);
            let maxx = Math.max(x0, x1);
            let maxy = Math.max(y0, y1);
            if (x >= minx && y >= miny && x < maxx && y < maxy)
                return i;
        }
        let rx = (x - position.x) / position.w;
        let ry = (y - position.y) / position.h;
        if (rx >= crop.x0 && rx < crop.x1 && ry > crop.y0 && ry < crop.y1)
            return 4;
        return null;
    }

    function adjustAspect(handle) {
        let a = aspects[aspect];
        if (a.w === 0 || a.h === 0)
            return;

        let ta = a.w / a.h;
        let ia = image.width / image.height;
        let ca = (crop.x1 - crop.x0) / (crop.y1 - crop.y0) * ia;
        if (ca < ta) {
            /* too tall */
            let h = (crop.x1 - crop.x0) * image.width / ta;
            switch (handle) {
                case 0:
                case 1:
                    crop.y0 = crop.y1 - h / image.height;
                    break;
                case 2:
                case 3:
                    crop.y1 = crop.y0 + h / image.height;
                    break;
            }
        } else if (ca > ta) {
            /* too wide */
            let w = (crop.y1 - crop.y0) * image.height * ta;
            switch (handle) {
                case 0:
                case 2:
                    crop.x0 = crop.x1 - w / image.width;
                    break;
                case 1:
                case 3:
                    crop.x1 = crop.x0 + w / image.width;
                    break;
            }
        }
    }

    canvas.addEventListener('drop', function(e) {
        e.preventDefault();
        let files = e.dataTransfer.files;
        window.x=e.dataTransfer;
        for (let i = 0; i < files.length; i++) {
            if (files[i].type === 'image/jpeg') {
                let r = new FileReader();
                filename = files[i].name;
                r.onload = function() {
                    image = new Image();
                    image.src = r.result;
                    crop.x0 = 0.0;
                    crop.y0 = 0.0;
                    crop.x1 = 1.0;
                    crop.y1 = 1.0;
                    aspect = 0;
                    aspectChanged = false;
                    draw();
                };
                r.readAsDataURL(files[i]);
                break;
            }
        }
    });

    canvas.addEventListener('dragover', function(e) {
        e.preventDefault();
    });

    canvas.addEventListener('mousedown', function(e) {
        e.preventDefault();
        dragStart = {x: e.clientX, y: e.clientY};
        cropStart = Object.assign({}, crop);
        active = findHandle(e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseup', function(e) {
        active = null;
        draw();
    });
    canvas.addEventListener('mouseleave', function(e) {
        active = null;
        draw();
    });
    canvas.addEventListener('mousemove', function(e) {
        if (active !== null) {
            e.preventDefault();
            let x = e.clientX;
            let y = e.clientY;
            let dx = (dragStart.x - x) / position.w;
            let dy = (dragStart.y - y) / position.h;
            let sx0 = cropStart.x0;
            let sy0 = cropStart.y0;
            let sx1 = cropStart.x1;
            let sy1 = cropStart.y1;
            switch (active) {
                case 0:
                    crop.x0 = Math.min(crop.x1, Math.max(0, sx0 - dx));
                    crop.y0 = Math.min(crop.y1, Math.max(0, sy0 - dy));
                    break;
                case 1:
                    crop.x1 = Math.max(crop.x0, Math.min(1, sx1 - dx));
                    crop.y0 = Math.min(crop.y1, Math.max(0, sy0 - dy));
                    break;
                case 2:
                    crop.x0 = Math.min(crop.x1, Math.max(0, sx0 - dx));
                    crop.y1 = Math.max(crop.y0, Math.min(1, sy1 - dy));
                    break;
                case 3:
                    crop.x1 = Math.max(crop.x0, Math.min(1, sx1 - dx));
                    crop.y1 = Math.max(crop.y0, Math.min(1, sy1 - dy));
                    break;
                case 4:
                    crop.x0 = sx0 - dx;
                    crop.y0 = sy0 - dy;
                    crop.x1 = sx1 - dx;
                    crop.y1 = sy1 - dy;
                    if (crop.x0 < 0) {
                        let err = -crop.x0;
                        crop.x0 += err;
                        crop.x1 += err;
                    }
                    if (crop.x1 > 1) {
                        let err = 1.0 - crop.x1;
                        crop.x0 += err;
                        crop.x1 += err;
                    }
                    if (crop.y0 < 0) {
                        let err = -crop.y0;
                        crop.y0 += err;
                        crop.y1 += err;
                    }
                    if (crop.y1 > 1) {
                        let err = 1.0 - crop.y1;
                        crop.y0 += err;
                        crop.y1 += err;
                    }
                    break;
            }
            adjustAspect(active);
            draw();
        }
    });

    window.addEventListener('resize', function() {
        draw();
    });

    let commandVis = false;
    window.addEventListener('keypress', function(e) {
        switch (e.charCode) {
            case 32:
                command.style.display = commandVis ? 'none' : 'inline-block';
                commandVis = !commandVis;
                break;
            case 97:
                aspect = (aspect + 1) % aspects.length;
                aspectChanged = true;
                adjustAspect(3);
                draw();
                break;
        }
    });
});
