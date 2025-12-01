// Device presets matching Penpot UI
// Organized by category for easy maintenance and AI readability

export const DEVICE_PRESETS = {
  // APPLE - iPhone
  'iphone-16': { width: 393, height: 852 },
  'iphone-16-pro': { width: 402, height: 874 },
  'iphone-16-pro-max': { width: 440, height: 956 },
  'iphone-16-plus': { width: 430, height: 932 },
  'iphone-15-pro-max': { width: 430, height: 932 },
  'iphone-15-pro': { width: 393, height: 852 },
  'iphone-14': { width: 390, height: 844 },
  'iphone-13-14': { width: 390, height: 844 },
  'iphone-14-plus': { width: 428, height: 926 },
  'iphone-13-mini': { width: 375, height: 812 },
  'iphone-se': { width: 320, height: 568 },
  'iphone-12-pro': { width: 390, height: 844 },
  'iphone-12-mini': { width: 360, height: 780 },
  'iphone-12-pro-max': { width: 428, height: 926 },
  'iphone-x-xs-11-pro': { width: 375, height: 812 },
  'iphone-xs-max-xr-11': { width: 414, height: 896 },
  
  // APPLE - iPad
  'ipad': { width: 768, height: 1024 },
  'ipad-mini': { width: 744, height: 1133 },
  'ipad-pro-10-5': { width: 834, height: 1112 },
  'ipad-pro-11': { width: 834, height: 1194 },
  'ipad-pro-12-9': { width: 1027, height: 1366 },
  
  // APPLE - Watch
  'watch-series-10': { width: 416, height: 496 },
  'watch-45mm': { width: 396, height: 484 },
  'watch-44mm': { width: 368, height: 448 },
  'watch-42mm': { width: 312, height: 390 },
  'watch-41mm': { width: 352, height: 430 },
  'watch-40mm': { width: 324, height: 394 },
  'watch-38mm': { width: 272, height: 340 },
  
  // APPLE - MacBook
  'macbook-air': { width: 1280, height: 832 },
  'macbook-pro-14': { width: 1512, height: 982 },
  'macbook-pro-16': { width: 1728, height: 1117 },
  
  // ANDROID
  'android-expanded': { width: 1280, height: 800 },
  'android-compact': { width: 412, height: 917 },
  'android-large': { width: 360, height: 800 },
  'android-medium': { width: 700, height: 840 },
  'android-small': { width: 360, height: 640 },
  'android-mobile': { width: 360, height: 640 },
  'android-tablet': { width: 768, height: 1024 },
  'pixel-7-pro': { width: 1440, height: 3120 },
  'pixel-6a-6': { width: 1080, height: 2400 },
  'pixel-4a-5': { width: 393, height: 851 },
  'galaxy-s22': { width: 1080, height: 2340 },
  'galaxy-s20-plus': { width: 384, height: 854 },
  'galaxy-a71-a51': { width: 412, height: 914 },
  
  // MICROSOFT
  'surface-pro-3': { width: 1440, height: 960 },
  'surface-pro-4-5-6-7': { width: 1368, height: 912 },
  'surface-pro-8': { width: 1440, height: 960 },
  
  // REMARKABLE
  'remarkable-2': { width: 1404, height: 1872 },
  'remarkable-pro': { width: 1620, height: 2160 },
  
  // WEB
  'web-1280': { width: 1280, height: 800 },
  'web-1366': { width: 1366, height: 768 },
  'web-1024': { width: 1024, height: 768 },
  'web-1920': { width: 1920, height: 1080 },
  
  // DESKTOP
  'desktop': { width: 1440, height: 1024 },
  'desktop-1440': { width: 1440, height: 1024 },
  'desktop-1920': { width: 1920, height: 1080 },
  'wireframe': { width: 1440, height: 1024 },
  'tv': { width: 1280, height: 720 },
  
  // PRESENTATION
  'slide-16-9': { width: 1920, height: 1080 },
  'slide-4-3': { width: 1027, height: 768 },
  
  // PRINT (96dpi)
  'a0': { width: 3179, height: 4494 },
  'a1': { width: 2245, height: 3179 },
  'a2': { width: 1587, height: 2245 },
  'a3': { width: 1123, height: 1587 },
  'a4': { width: 794, height: 1123 },
  'a5': { width: 559, height: 794 },
  'a6': { width: 397, height: 559 },
  'letter': { width: 816, height: 1054 },
  'din-lang': { width: 835, height: 413 },
  
  // SOCIAL MEDIA
  'instagram-profile': { width: 320, height: 320 },
  'instagram-post': { width: 1080, height: 1350 },
  'instagram-story': { width: 1080, height: 1920 },
  'facebook-profile': { width: 720, height: 720 },
  'facebook-cover': { width: 820, height: 312 },
  'facebook-post': { width: 1200, height: 630 },
  'linkedin-profile': { width: 400, height: 400 },
  'linkedin-cover': { width: 1584, height: 396 },
  'linkedin-post': { width: 520, height: 320 },
  'bluesky-profile': { width: 400, height: 400 },
  'bluesky-cover': { width: 3000, height: 1000 },
  'bluesky-post': { width: 1080, height: 1350 },
  'x-profile': { width: 400, height: 400 },
  'x-header': { width: 1500, height: 500 },
  'x-post': { width: 1024, height: 512 },
  'twitter-header': { width: 1500, height: 500 }, // Alias for x-header
  'youtube-profile': { width: 800, height: 800 },
  'youtube-banner': { width: 2560, height: 1440 },
  'youtube-cover': { width: 2048, height: 1152 },
  'youtube-thumb': { width: 1280, height: 720 },
} as const;

export type PresetName = keyof typeof DEVICE_PRESETS;
