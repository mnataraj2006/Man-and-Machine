/**
 * branches.js
 * -----------
 * Central data registry for all Man & Machine Fitness locations.
 * Note: These reflect publicly listed business details.
 * For unverified or pending details, users are advised to contact the branch.
 */

export const branches = [
  {
    id: 'kovilpatti',
    name: 'Man & Machine Fitness Gym',
    city: 'Kovilpatti',
    tag: 'FLAGSHIP FACILITY',
    address: 'Balaji Complex, 580E/5, Ettayapuram Road, Thittankulam, Kovilpatti, Tamil Nadu – 628501',
    landmark: 'Near Thittankulam junction, easy arterial road access',
    phone: '+91 75988 85566',
    phoneRaw: '+917598885566',
    rating: 4.9,
    reviewCount: 183,
    hours: [
      { days: 'Monday — Saturday', time: '5:30 AM — 9:30 PM' },
      { days: 'Sunday', time: '5:30 AM — 10:00 AM' },
    ],
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Man+%26+Machine+Fitness+Gym+Kovilpatti',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqsSy4MbhT_2yyFpji6XWFXfNz85bGohPKA7s-_m68TItaIl5y9alhcv5cBOzizHbTSkPDmf7wYO0D16qnTeWIWY_XHs9rCC3FXVeqQggzGX8Q_0L5-QMwJmuSvdAMCKfie9klcLKe2J5U054VUwU92-87OQ9ezUi_BZZWCQ5QiHczVxEHiE0GxlKEA-_UI9ZUVFC-gDMeTB39fQ2YeW2sFsJmTwHr6o61FATVBqO8',
    isVerifiedAddress: true,
  },
  {
    id: 'karur',
    name: 'Man & Machine Fitness',
    city: 'Karur',
    tag: 'REGIONAL DESTINATION',
    address: 'Karur, Tamil Nadu',
    addressNote: 'Please contact the branch to confirm exact facility premises',
    phone: null,
    phoneDisplay: 'Contact details coming soon',
    rating: 4.9,
    reviewCount: 87,
    hours: [
      { days: 'Daily Morning', time: '4:30 AM — 11:00 AM' },
      { days: 'Daily Evening', time: '4:00 PM — 10:00 PM' },
    ],
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Man+%26+Machine+Fitness+Karur',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-gVHmaRbRYUsFExforkbRsxVPJmfbSo9aapqGL1NBQIiV0CVW2TiVO5ozvT_4Fuwnq79dhLrItL7cntx1OXjhF-EN5gy6r5d8-o7jiPbKZWl-viUiEXV2djMyIjqn0utQPfnXEf2lcBGULycV3NGSZIxj4NYsPHbUXPmHJOkRsxJ29K1DCinZCMZBVasnpmyNlwmcHUmDryxqaj4PaTp8T-mQqHjVbUz0A8jQvcov',
    isVerifiedAddress: false,
  },
  {
    id: 'sivakasi',
    name: 'Man & Machine Fitness',
    city: 'Sivakasi',
    tag: 'REGIONAL DESTINATION',
    address: 'Sivakasi, Tamil Nadu',
    addressNote: 'Please contact the branch to confirm exact facility premises',
    phone: '+91 70142 33840',
    phoneRaw: '+917014233840',
    rating: 4.9,
    reviewCount: 52,
    hours: [
      { days: 'Monday — Saturday', time: '5:00 AM — 10:00 PM' },
      { days: 'Sunday', time: '5:00 AM — 12:00 PM' },
    ],
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Man+%26+Machine+Fitness+Sivakasi',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTJCmNpOexzNahVDQ74yvtaIvXhYSW4FwnFV2x3WgrdZig1z_gDo5p7ARX20HJF8WxmgDM4pBhInuhNTqBJnk4y1IYrW8sZkiTTkuRYFZzkV3fcUPc5cE-my0HEafzJRVW8Ftm4M0x6r7fOImblAy15PvEMOYjDT4VpByijBaIhAl4i4Kyv0SIoNEF4NfMbnroPbiMk-O-VCmooZo9leEUMXtVmeSDPBKM6Fe-F4l0',
    isVerifiedAddress: false,
  },
];
