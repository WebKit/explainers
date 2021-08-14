"use strict";

class Path {
    constructor() {
        this.points = [];
        this.color = "";
    }

    addPoint(x, y) {
        this.points.push({ x: x, y: y });
    }

    isEmpty() {
        return !this.points.length;
    }

    svgPath() {
        if (this.isEmpty())
            return "";
        const firstPoint = this.points[0];
        const pathDescriptor = this.points.map(point => `L${point.x} ${point.y}`).join(" ");
        return `<path fill="transparent" stroke-width="4" stroke="${this.color}" d="M${firstPoint.x} ${firstPoint.y} ${pathDescriptor}"/>`;
    }
}

function setupCanvasForDrawing(container) {
    let paths = [];
    let pointerIsDown = false;
    let initialOffsetForResizing = 0;
    let initialHeightForResizing = 0;
    let lockedForResizing = false;
    let lastStrokeTimestamp = 0;
    let lastStrokeColor = null;
    const canvas = container.querySelector("canvas");
    const colorPicker = container.querySelector("input[type='color']");
    const resizeHandle = container.querySelector(".resize-handle")
    const containerBounds = container.getBoundingClientRect();
    canvas.width = containerBounds.width * 2;
    canvas.height = containerBounds.height * 2;
    const context = canvas.getContext("2d");

    addEventListener("resize", () => {
        const bounds = container.getBoundingClientRect();
        canvas.width = bounds.width * 2;
        canvas.height = bounds.height * 2;
        schedulePaint();
        initialOffsetForResizing = 0;
        initialHeightForResizing = 0;
    });

    function endResizing() {
        if (!lockedForResizing)
            return false;

        const previousHeight = initialHeightForResizing;
        const newHeight = container.getBoundingClientRect().height;

        if (newHeight == previousHeight || !previousHeight)
            return false;

        lockedForResizing = false;
        initialOffsetForResizing = 0;
        initialHeightForResizing = 0;
        if (!document.undoManager)
            return true;

        document.undoManager.addItem(new UndoItem({
            label: "Resize Drawing",
            undo: () => {
                container.style.height = `${previousHeight}px`;
                canvas.height = previousHeight * 2;
                schedulePaint();
            },
            redo: () => {
                container.style.height = `${newHeight}px`;
                canvas.height = newHeight * 2;
                schedulePaint();
            }
        }));
        return true;
    }

    function schedulePaint() {
        requestAnimationFrame(() => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            for (const path of paths) {
                if (path.isEmpty())
                    continue;

                const points = path.points;
                context.beginPath();
                context.strokeStyle = path.color;
                context.lineWidth = 4;
                context.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; ++i)
                    context.lineTo(points[i].x, points[i].y);
                context.stroke();
                context.closePath();
            }
        });
    }

    function beginStroke(event) {
        pointerIsDown = true;
        if (document.activeElement === colorPicker)
            colorPicker.blur();
        paths.push(new Path());
    }

    function continueStroke(event) {
        if (lockedForResizing)
            return;

        if (!pointerIsDown || !paths.length)
            return;

        const canvasBounds = canvas.getBoundingClientRect();
        const canvasElementX = event.clientX - canvasBounds.left;
        const canvasElementY = event.clientY - canvasBounds.top;
        const widthScale = canvasBounds.width / canvas.width;
        const heightScale = canvasBounds.height / canvas.height;
        const canvasX = canvasElementX / widthScale;
        const canvasY = canvasElementY / heightScale;
        const currentPath = paths[paths.length - 1];
        const [red, green, blue] = parseRGBFromHex(colorPicker ? colorPicker.value : "#EEEEEE");
        currentPath.color = `rgb(${red}, ${green}, ${blue})`;
        currentPath.addPoint(canvasX, canvasY);
        schedulePaint();
    }

    function endStroke() {
        if (endResizing())
            return;

        if (!pointerIsDown)
            return;

        pointerIsDown = false;
        if (!paths.length)
            return;

        const newPath = paths[paths.length - 1];
        if (newPath.isEmpty())
            return;

        const currentTime = new Date().getTime();
        const shouldMerge = newPath.color === lastStrokeColor && currentTime - lastStrokeTimestamp <= 1000;

        lastStrokeTimestamp = currentTime;
        lastStrokeColor = newPath.color;

        if (!document.undoManager)
            return;

        document.undoManager.addItem(new UndoItem({
            label: "Drawing",
            undo: () => {
                paths.pop();
                schedulePaint();
            },
            redo: () => {
                paths.push(newPath);
                schedulePaint();
            },
            merged: shouldMerge
        }))
    }

    canvas.addEventListener("pointerdown", beginStroke);
    canvas.addEventListener("pointermove", continueStroke);
    canvas.addEventListener("pointerout", endStroke);
    canvas.addEventListener("pointerup", endStroke);

    resizeHandle.addEventListener("pointerdown", event => {
        const containerBounds = container.getBoundingClientRect();
        initialOffsetForResizing = event.clientY - containerBounds.top;
        initialHeightForResizing = containerBounds.height;
        lockedForResizing = true;
    });

    resizeHandle.addEventListener("pointermove", event => {
        if (!lockedForResizing)
            return;

        const containerBounds = container.getBoundingClientRect();
        const resizeDelta = (event.clientY - containerBounds.top) - initialOffsetForResizing;
        const newHeight = Math.max(200, initialHeightForResizing + resizeDelta);
        container.style.height = `${newHeight}px`;
        canvas.height = newHeight * 2;
        schedulePaint();
    });

    resizeHandle.addEventListener("pointerup", endResizing);
}
