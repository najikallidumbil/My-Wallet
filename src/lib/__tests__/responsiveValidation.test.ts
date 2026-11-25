/**
 * Responsive Multi-Device Validation Suite
 * Tests layout computations and breakpoints across all user-specified screen resolutions:
 * 320px, 360px, 375px, 390px, 430px, 768px, 1024px, 1366px.
 */

interface ResponsiveMetrics {
  width: number;
  height: number;
  isNarrowMobile: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  contentPadding: number;
  columns: number;
}

function calculateResponsiveMetrics(width: number, height: number = 800): ResponsiveMetrics {
  const isNarrowMobile = width < 360;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  let contentPadding = 16;
  if (isNarrowMobile) {
    contentPadding = 12;
  } else if (isTablet) {
    contentPadding = 24;
  } else if (isDesktop) {
    contentPadding = 32;
  }

  let columns = 1;
  if (width >= 1200) {
    columns = 4;
  } else if (width >= 768) {
    columns = 2;
  } else if (width >= 420) {
    columns = 2;
  } else {
    columns = 1;
  }

  return {
    width,
    height,
    isNarrowMobile,
    isMobile,
    isTablet,
    isDesktop,
    contentPadding,
    columns,
  };
}

export function runResponsiveValidation(): { passed: boolean; results: { screen: string; passed: boolean; details: string }[] } {
  const screens = [
    { name: '320px (Narrow Mobile / iPhone SE 1st gen)', width: 320, expectNarrow: true, expectMobile: true, expectTablet: false, expectDesktop: false },
    { name: '360px (Standard Mobile / Android Compact)', width: 360, expectNarrow: false, expectMobile: true, expectTablet: false, expectDesktop: false },
    { name: '375px (iPhone SE 2nd / iPhone X)', width: 375, expectNarrow: false, expectMobile: true, expectTablet: false, expectDesktop: false },
    { name: '390px (iPhone 12/13/14)', width: 390, expectNarrow: false, expectMobile: true, expectTablet: false, expectDesktop: false },
    { name: '430px (iPhone 14/15 Pro Max)', width: 430, expectNarrow: false, expectMobile: true, expectTablet: false, expectDesktop: false },
    { name: '768px (iPad Mini / Tablet Portrait)', width: 768, expectNarrow: false, expectMobile: false, expectTablet: true, expectDesktop: false },
    { name: '1024px (iPad Pro / Small Laptop)', width: 1024, expectNarrow: false, expectMobile: false, expectTablet: false, expectDesktop: true },
    { name: '1366px (Desktop HD)', width: 1366, expectNarrow: false, expectMobile: false, expectTablet: false, expectDesktop: true },
  ];

  const results: { screen: string; passed: boolean; details: string }[] = [];

  for (const s of screens) {
    const m = calculateResponsiveMetrics(s.width);
    const passNarrow = m.isNarrowMobile === s.expectNarrow;
    const passMobile = m.isMobile === s.expectMobile;
    const passTablet = m.isTablet === s.expectTablet;
    const passDesktop = m.isDesktop === s.expectDesktop;

    // Check inner content width (must be positive, no overflow)
    const sidebarWidth = m.isTablet || m.isDesktop ? 260 : 0;
    const usableWidth = s.width - sidebarWidth;
    const innerContentWidth = usableWidth - (m.contentPadding * 2);

    const hasPositiveWidth = innerContentWidth > 200;

    // Check OTP input boxes fit: 6 boxes with 5 gaps
    const cardPadding = m.isNarrowMobile ? 14 : 24;
    const cardInnerWidth = Math.min(440, s.width - (m.contentPadding * 2)) - (cardPadding * 2);
    const gap = m.isNarrowMobile ? 5 : 8;
    const boxWidth = (cardInnerWidth - (5 * gap)) / 6;
    const otpBoxesFit = boxWidth >= 32;

    const allPassed = passNarrow && passMobile && passTablet && passDesktop && hasPositiveWidth && otpBoxesFit;

    results.push({
      screen: s.name,
      passed: allPassed,
      details: `Usable: ${usableWidth}px, Inner: ${innerContentWidth}px, Cols: ${m.columns}, OTP Box: ${boxWidth.toFixed(1)}px (Padding: ${m.contentPadding}px)`,
    });
  }

  const overallPassed = results.every((r) => r.passed);
  return { passed: overallPassed, results };
}

// Run immediately if executed directly
const res = runResponsiveValidation();
console.log('=== MULTI-DEVICE RESPONSIVE VALIDATION ===');
res.results.forEach((r) => {
  console.log(`${r.passed ? '✓' : '✗'} ${r.screen}: ${r.details}`);
});
console.log(`\nOverall Result: ${res.passed ? 'ALL RESOLUTIONS PASSED' : 'SOME RESOLUTIONS FAILED'}`);
