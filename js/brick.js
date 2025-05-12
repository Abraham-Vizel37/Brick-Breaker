import { settings, standardBrickColors } from './constants.js';
import { gameLevels } from './levels.js';
import { paddle } from './paddle.js'; // For calculating available height for bricks
// gameState will be passed to functions needing level, bricks array, boss state, etc.

// Helper function to map brick type values (1-7) to their corresponding standard brick color.
function getStandardBrickColor(typeValue) {
    const colorIndex = (typeValue - 1); 
    if (colorIndex >= 0 && colorIndex < standardBrickColors.length) {
        return standardBrickColors[colorIndex];
    }
    return '#FFFFFF'; // Default white
}

// Helper function to darken a given hex color by a specified amount (0-1).
function darkenColor(color, amount) {
    let r = parseInt(color.substring(1,3), 16);
    let g = parseInt(color.substring(3,5), 16);
    let b = parseInt(color.substring(5,7), 16);
    r = Math.max(0, Math.floor(r * (1 - amount)));
    g = Math.max(0, Math.floor(g * (1 - amount)));
    b = Math.max(0, Math.floor(b * (1 - amount)));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Helper function to lighten a given hex color by a specified amount (0-1).
function lightenColor(hex, percent) {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) {
        hex = hex.replace(/(.)/g, '$1$1');
    }
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    r = Math.min(255, Math.floor(r * (1 + percent)));
    g = Math.min(255, Math.floor(g * (1 + percent)));
    b = Math.min(255, Math.floor(b * (1 + percent)));

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Updated function to draw a diagonal sweep animation, with special handling for silver bricks
function drawMetallicSweepAnimation(ctx, brick, animationProgress, baseAppearanceColor, isSilverSpecialAnimation) {
    const sweepLineThickness = Math.max(2, brick.height * 0.25);
    const skewFactor = 0.3;
    const skewAmount = brick.height * skewFactor;

    // Define sweep line geometry
    const effectiveSweepObjectWidth = sweepLineThickness + skewAmount;
    const travelPathLength = Math.max(0, brick.width - effectiveSweepObjectWidth);
    const currentXOffset = skewAmount + (animationProgress * travelPathLength);

    // Parallelogram points for the sweep line (relative to brick.x, brick.y)
    const p1 = { x: currentXOffset, y: 0 };
    const p2 = { x: currentXOffset + sweepLineThickness, y: 0 };
    const p3 = { x: currentXOffset + sweepLineThickness - skewAmount, y: brick.height };
    const p4 = { x: currentXOffset - skewAmount, y: brick.height };

    ctx.save();
    // Clip all drawing to the brick's boundaries
    ctx.beginPath();
    ctx.rect(brick.x, brick.y, brick.width, brick.height);
    ctx.clip();

    if (isSilverSpecialAnimation) {
        const silverBase = baseAppearanceColor; // This is already potentially darkened silver
        const darkerSilver = darkenColor(silverBase, 0.0);
        const lighterSilver = lightenColor(silverBase, 0.15);
        const sweepLineColorSilver = 'rgba(255, 255, 255, 0.75)';

        // Calculate areas of the regions to the left and right of the sweep
        const area1 = 0.5 * (2 * currentXOffset - skewAmount) * brick.height;
        const area3 = 0.5 * (2 * brick.width - 2 * currentXOffset - 2 * sweepLineThickness + skewAmount) * brick.height;

        let fillRegion1Color, fillRegion3Color;
        if (area1 > area3) {
            fillRegion1Color = darkerSilver;
            fillRegion3Color = lighterSilver;
        } else if (area3 > area1) {
            fillRegion1Color = lighterSilver;
            fillRegion3Color = darkerSilver;
        } else { // Equal areas or other edge cases
            fillRegion1Color = lighterSilver; // Default assignment
            fillRegion3Color = darkerSilver;
        }

        // Draw Region 1: Part behind/left of sweep
        ctx.beginPath();
        ctx.moveTo(brick.x, brick.y); // Top-left of brick
        ctx.lineTo(brick.x + p1.x, brick.y + p1.y);
        ctx.lineTo(brick.x + p4.x, brick.y + p4.y);
        ctx.lineTo(brick.x, brick.y + brick.height); // Bottom-left of brick
        ctx.closePath();
        ctx.fillStyle = fillRegion1Color;
        ctx.fill();

        // Draw Region 3: Part ahead/right of sweep
        ctx.beginPath();
        ctx.moveTo(brick.x + p2.x, brick.y + p2.y);
        ctx.lineTo(brick.x + brick.width, brick.y); // Top-right of brick
        ctx.lineTo(brick.x + brick.width, brick.y + brick.height); // Bottom-right of brick
        ctx.lineTo(brick.x + p3.x, brick.y + p3.y);
        ctx.closePath();
        ctx.fillStyle = fillRegion3Color;
        ctx.fill();
        
        // Draw Region 2: Sweep line itself (on top)
        ctx.beginPath();
        ctx.moveTo(brick.x + p1.x, brick.y + p1.y);
        ctx.lineTo(brick.x + p2.x, brick.y + p2.y);
        ctx.lineTo(brick.x + p3.x, brick.y + p3.y);
        ctx.lineTo(brick.x + p4.x, brick.y + p4.y);
        ctx.closePath();
        ctx.fillStyle = sweepLineColorSilver;
        ctx.fill();

    } else {
        // Original sweep for non-silver (e.g., gold bricks)
        // Assumes the base brick color was already filled by drawBricks
        const sweepColor = baseAppearanceColor === '#F0BC3C' ? 'rgba(255, 255, 220, 0.6)' : 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(brick.x + p1.x, brick.y + p1.y);
        ctx.lineTo(brick.x + p2.x, brick.y + p2.y);
        ctx.lineTo(brick.x + p3.x, brick.y + p3.y);
        ctx.lineTo(brick.x + p4.x, brick.y + p4.y);
        ctx.closePath();
        ctx.fillStyle = sweepColor;
        ctx.fill();
    }

    ctx.restore();
}

export function initBricks(canvas, currentGameState) {
    console.log("initBricks called for level:", currentGameState.level); 
    if (!canvas) { console.error("Canvas element not found in initBricks!"); return []; }

    let newBricks = [];
    currentGameState.boss.exists = false; 
    // if(bossHPBar) bossHPBar.style.display = 'none'; // UI concern, handled in ui.js
    currentGameState.currentLevelConcept = "Level Style " + currentGameState.level;

    if (currentGameState.level > settings.totalLevelsCount) {
        // This case will be handled by game logic in game.js (e.g., show allLevelsCompleteScreen)
        console.log("All levels cleared in initBricks logic.");
        return []; // No bricks to create
    }

    const levelData = gameLevels[currentGameState.level];

    if (!levelData || !levelData.pattern) {
        console.error("Level data not found for level " + currentGameState.level);
        // This case also handled by game logic in game.js (e.g., gameOver due to missing level)
        return []; // No bricks to create
    }

    const pattern = levelData.pattern;
    const powerupsData = levelData.powerups || {};
    const patternRows = pattern.length;
    const patternCols = pattern[0].length;

    let brickWidth, brickHeight;
    if (canvas.width > 0 && canvas.height > 0) {
        brickWidth = (canvas.width - settings.brickPadding * (patternCols + 1)) / patternCols;
        const availableHeight = paddle.y - settings.brickOffsetTop - settings.brickPadding;
        brickHeight = (availableHeight - settings.brickPadding * (patternRows + 1)) / patternRows;
        brickHeight = Math.max(10, Math.min(30, brickHeight)); 
    } else {
        console.warn("Canvas size zero or invalid during brick initialization. Using fallback.");
        const defaultCols = 13;
        const defaultRows = 12;
        brickWidth = (300 - settings.brickPadding * (defaultCols + 1)) / defaultCols;
        brickHeight = 20;
    }

    console.log("Brick dimensions:", brickWidth, brickHeight); 

    for (let r = 0; r < patternRows; r++) {
        for (let c = 0; c < patternCols; c++) {
            const brickType = pattern[r][c];
            if (brickType > 0) {
                const brickX = (c * (brickWidth + settings.brickPadding)) + settings.brickPadding;
                const brickY = (r * (brickHeight + settings.brickPadding)) + settings.brickOffsetTop;

                let hp = 1;
                let color = '#FFFFFF';
                let isUnbreakable = false;
                let powerupType = null;
                const originalColor = color; // Store original color for animation reference

                if (brickType >= 1 && brickType <= 8) {
                    color = getStandardBrickColor(brickType);
                    hp = 1;
                } else if (brickType === 9) {
                    hp = 2 + Math.floor((currentGameState.level - 1) / 10);
                    color = '#BCBCBC'; // Silver
                } else if (brickType === 10) {
                    hp = Infinity;
                    isUnbreakable = true;
                    color = '#F0BC3C'; // Gold
                }

                const powerupKey = `${r},${c}`;
                if (powerupsData[powerupKey]) {
                    powerupType = powerupsData[powerupKey];
                }

                newBricks.push({
                    x: brickX, y: brickY, width: brickWidth, height: brickHeight,
                    status: 1, hp: hp, maxHp: hp, color: color, originalColor: color, // Store original color
                    isBoss: false, isUnbreakable: isUnbreakable, powerupType: powerupType,
                    isHitAnimating: false, // For hit animation
                    hitAnimationStartTime: 0,
                    hitAnimationDuration: 300 // Duration in ms for the hit flash (now sweep)
                });
            }
        }
    }
    console.log("Finished initBricks. Bricks count:", newBricks.length);
    return newBricks;
}

export function drawBricks(ctx, bricksToDraw) {
    if (!ctx) return;

    bricksToDraw.forEach(brick => {
        if (brick.status === 1) {
            ctx.beginPath();
            ctx.rect(brick.x, brick.y, brick.width, brick.height);

            let currentDisplayColor;
            const isSilverBrick = brick.maxHp > 1 && brick.originalColor === '#BCBCBC';
            const isGoldBrick = brick.isUnbreakable; // Assuming originalColor for gold is #F0BC3C

            if (isGoldBrick) {
                currentDisplayColor = '#F0BC3C';
            } else if (isSilverBrick) {
                const silverDarkness = (brick.maxHp - brick.hp) / (brick.maxHp - 1) * 0.4;
                currentDisplayColor = darkenColor('#BCBCBC', silverDarkness);
            } else {
                currentDisplayColor = brick.originalColor;
            }

            let isAnimatingThisBrick = false;
            if (brick.isHitAnimating) {
                const elapsedTime = performance.now() - brick.hitAnimationStartTime;
                if (elapsedTime < brick.hitAnimationDuration) {
                    isAnimatingThisBrick = true;
                    const animationProgress = elapsedTime / brick.hitAnimationDuration;

                    if (isSilverBrick) {
                        // Silver special animation handles its own fill
                        drawMetallicSweepAnimation(ctx, brick, animationProgress, currentDisplayColor, true);
                    } else if (isGoldBrick) {
                        // Gold brick: fill base, then draw sweep line
                        ctx.fillStyle = currentDisplayColor;
                        ctx.fill();
                        drawMetallicSweepAnimation(ctx, brick, animationProgress, currentDisplayColor, false);
                    } else {
                        // Simple flash for other animating bricks (if any)
                        const intensityFactor = Math.sin(animationProgress * Math.PI);
                        const highlightPercent = intensityFactor * 0.2;
                        if (highlightPercent > 0) {
                            currentDisplayColor = lightenColor(currentDisplayColor, highlightPercent);
                        }
                        ctx.fillStyle = currentDisplayColor;
                        ctx.fill();
                    }
                } else {
                    brick.isHitAnimating = false;
                }
            }

            // If not animating OR if it's a type of animation that doesn't do its own fill (e.g. non-silver/gold flash)
            if (!isAnimatingThisBrick || (isAnimatingThisBrick && !isSilverBrick && !isGoldBrick) ) {
                 if(!(isAnimatingThisBrick && isSilverBrick)) { // Avoid double fill for silver
                    ctx.fillStyle = currentDisplayColor;
                    ctx.fill();
                 }
            }
            
            if (isAnimatingThisBrick && isSilverBrick && (performance.now() - brick.hitAnimationStartTime >= brick.hitAnimationDuration) ){
                 // ensure final fill for silver if animation just ended
                ctx.fillStyle = currentDisplayColor;
                ctx.fill();
            }

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            if (isSilverBrick) {
                ctx.font = '16px Arial';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(brick.hp, brick.x + brick.width / 2, brick.y + brick.height / 2);
            }
            ctx.closePath();
        }
    });
} 