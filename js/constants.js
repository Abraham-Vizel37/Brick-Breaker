export const settings = {
    brickPadding: 2, 
    brickOffsetTop: 0, 
    paddleHeight: 16, 
    paddleWidth: 100, 
    ballRadius: 5, 
    baseBallSpeed: 6, 
    ballSpeedMultiplier: 1, // DEPRECATED: Replaced by activeSpeedModifier.
    ballDamage: 1, 
    randomPowerupChance: 0.03, 
    extraLifeDropChance: 0.01, 
    powerupSpeed: 1.5, 
    powerupDuration: 10000, 
    laserDuration: 8000, 
    breakDuration: 8000, 
    slowDuration: 8000, 
    fastDuration: 8000, 
    slowBallFactor: 0.6, 
    fastBallFactor: 1.4, 
    minPaddleWidth: 60, 
    maxPaddleWidth: 120, 
    laserFireRate: 25, 
    laserHeight: 20, 
    laserXOffset: 0.1, 
    totalLevelsCount: 40
};

export const colorPalettes = [
    { name: 'Default', colors: ['#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#EE82EE'] }, 
    { name: 'Ocean Calm', colors: ['#A3E4D7', '#85C1E9', '#5DADE2', '#2E86C1', '#21618C', '#1A5276', '#0E4D6A'] },
    { name: 'Forest Walk', colors: ['#D9E3DA', '#A2D9CE', '#73C6B6', '#48B09A', '#1E8449', '#186A3B', '#145A32'] },
    { name: 'Sunset Glow', colors: ['#F9E79F', '#F5C074', '#F1A97D', '#EC7063', '#CB4335', '#B03A2E', '#943126'] },
    { name: 'Pastel Dreams', colors: ['#F5B7B1', '#FADBD8', '#E8DAEF', '#D2B4DE', '#A9CCE3', '#85C1E9', '#5DADE2'] },
    { name: 'Neon Nights', colors: ['#FF00FF', '#00FFFF', '#FFFF00', '#00FF00', '#FF0000', '#800080', '#008080'] },
    { name: 'Earthy Tones', colors: ['#D8C3A5', '#EAE7DC', '#A7A38E', '#8E8D80', '#E98074', '#D66F63', '#C35E52'] },
    { name: 'Deep Space', colors: ['#1A2E4A', '#2C3E50', '#34495E', '#5D6D7E', '#7F8C8D', '#9BABB2', '#AFB9C1'] },
    { name: 'Grapevine', colors: ['#7D3C98', '#A569BD', '#D2B4DE', '#E8DAEF', '#FADBD8', '#FADCDF', '#FCE0E4'] },
    { name: 'Tropical Punch', colors: ['#F39C12', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6', '#8E44AD', '#7D3C98'] },
    { name: 'Retro Arcade', colors: ['#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#EE82EE'] },
    { name: 'Pixel Dust', colors: ['#C0C0C0', '#A9A9A9', '#808080', '#696969', '#778899', '#8899A6', '#9BB0BC'] },
    { name: 'Candy Pop', colors: ['#FF69B4', '#FFB6C1', '#FFD700', '#98FB98', '#ADD8E6', '#B0E0E6', '#C0F0F6'] },
    { name: 'Lava Flow', colors: ['#8B0000', '#DC143C', '#FF4500', '#FF8C00', '#FFD700', '#FFEE00', '#FFFF00'] },
    { name: 'Emerald City', colors: ['#006400', '#228B22', '#32CD32', '#90EE90', '#F0E68C', '#DDA0DD', '#EE82EE'] }
];

export const powerupTypes = [
    { name: 'Slow Ball', symbol: 'S', type: 'slowBall', color: '#AED6F1' }, 
    { name: 'Fast Ball', symbol: 'F', type: 'fastBall', color: '#FFFF00' }, 
    { name: 'Multi Ball', symbol: 'D', type: 'multiBall', color: '#2196F3' }, 
    { name: 'Extend Paddle', symbol: 'E', type: 'widerPaddle', color: '#4CAF50' }, 
    { name: 'Laser Paddle', symbol: 'P', type: 'laser', color: '#FF9800' }, 
    { name: 'Catch Paddle', symbol: 'C', type: 'catch', color: '#E91E63' }, 
    { name: 'Break Ball', symbol: 'B', type: 'break', color: '#FF4500' }, 
    { name: 'Extra Life', symbol: 'L', type: 'extraLife', color: '#FFFFFF' } 
];

export const randomDroppableTypes = powerupTypes.filter(p => p.type !== 'extraLife' && p.type !== 'catch');

export const standardBrickColors = [
    '#D82800', '#FC7460', '#FC9838', '#80D010', '#3CBCFC', '#0070EC', '#FC74B4','#FCFCFC'
]; 