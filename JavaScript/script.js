const granularDegree = 0.05;
const debug = false;

function computeRatio(img)
{

    if (debug) 
    {
        if (debug) 
        {
            const canvas = document.getElementById('canvasInput'); // Get the canvas element
            // Check if canvas exists
            if (canvas) {
                // Get the canvas data as a data URL
                const imageDataURL = canvas.toDataURL('image/png');
        
                // Create a link element
                const link = document.createElement('a');
                link.download = 'f.png'; // Set the download attribute to specify the filename
                link.href = imageDataURL; // Set the href attribute to the data URL
                link.click(); // Simulate a click on the link to trigger the download
            } else {
                console.error('Canvas element not found');
            }
        }
    }

    const kernel = new cv.Mat.ones(3, 3, cv.CV_8U);

    let dst = new cv.Mat();
    let thresh = new cv.Mat();
    let anchor = new cv.Point(-1, -1);
    cv.erode(img, dst, kernel, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.dilate(dst, thresh, kernel, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    dst.delete(); 
    kernel.delete();
    
    if(debug)
    {
        cv.imshow('canvasOutput', thresh);
    }

    let grayImg = new cv.Mat();
    cv.cvtColor(thresh, grayImg,cv.COLOR_BGR2GRAY);

    const subcutArea = computeAreas(grayImg);
    console.log('Computed subcutArea:', subcutArea);

    const totalArea = computeWhiteArea(grayImg);
    console.log('Computed totalArea:', totalArea);

    const ratio = totalArea / subcutArea - 1;
    console.log('Computed ratio:', ratio);

    grayImg.delete();

    document.getElementById('ratioDisplay').innerText = 'Computed ratio: ' + ratio;

    if (ratio > 0.63) {
        document.getElementById('resultDisplay').innerText = 'Prediction : Crohn\'s';
    } else {
        document.getElementById('resultDisplay').innerText = 'Prediction : iTb/Normal';
    }
}

function processImage() 
{
    let src = cv.imread('canvasInput');

    const ratio = computeRatio(src);
    console.log('Computed ratio:', ratio); 
    
    src.delete();
}

function* lineIter(start, end) {
    let [x0, y0] = start;
    const [x1, y1] = end;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        yield [x0, y0];

        if (x0 === x1 && y0 === y1) {
            break;
        }

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

function findLastPoint(img, start, end) {
    let lastBlackPoint = null;
    let lastWhitePoint = null;
    let answer = null;

    for (const [x, y] of lineIter(start, end)) {
        if (x >= 0 && x < img.cols && y >= 0 && y < img.rows) {
            if (img.ucharAt(y, x) === 0) {
                lastBlackPoint = [x, y];
            } else if (lastBlackPoint && img.ucharAt(y, x) !== 0) {
                answer = lastBlackPoint;
            }

            if (img.ucharAt(y, x) === 255) {
                lastWhitePoint = [x, y];
            }
        }
    }

    return [answer,lastWhitePoint];
}

// Function to compute the area
function computeAreas(img) {
    const height = img.rows;
    const width = img.cols;
    const center = [Math.floor(width / 2), Math.floor(height / 2)];
    let subcutArea = 0;

    for (let angle = 0; angle < 360; angle += granularDegree) 
    {
        const theta = angle * (Math.PI / 180);
        const endX = Math.floor(center[0] + Math.cos(theta) * width);
        const endY = Math.floor(center[1] + Math.sin(theta) * height);
        const [bk, wh] = findLastPoint(img, center, [endX, endY]);      

        if (bk && wh) {
            subcutArea += 0.5 * ((wh[0] - center[0]) ** 2 + (wh[1] - center[1]) ** 2 - (bk[0] - center[0]) ** 2 - (bk[1] - center[1]) ** 2) * granularDegree * (Math.PI / 180);
        }
    }

    return subcutArea;
}

function computeWhiteArea(img) {
    let total = 0;

    for (let y = 0; y < img.rows; y++) {
        for (let x = 0; x < img.cols; x++) {
            // Access pixel value at (x, y)
            const pixelValue = img.ucharAt(y, x);

            // Check if pixel value is white (255)
            if (pixelValue === 255) {
                total++;
            }
        }
    }

    return total;
}