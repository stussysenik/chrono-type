const std = @import("std");

// ─── Welford's Online Algorithm State ───────────────────────────────────────
// Internal computation uses f64 for numerical stability; exported getters
// return f32 for WASM ABI simplicity.

var n: u32 = 0;
var mean: f64 = 0.0;
var m2: f64 = 0.0;
var min_val: f64 = std.math.inf(f64);
var max_val: f64 = -std.math.inf(f64);

// ─── Histogram Binning ──────────────────────────────────────────────────────
// 20 bins × u32, covering 0–200ms in 10ms buckets.
// Values >= 200ms clamp to bin 19.

var histogram: [20]u32 = [_]u32{0} ** 20;
var overflow_flag: u8 = 0;

// ─── Exported Functions ─────────────────────────────────────────────────────

/// Feed one inter-key interval (in milliseconds).
/// Negative deltas are silently ignored. Updates both Welford state
/// and the histogram bin in O(1).
export fn update(delta_ms: f32) void {
    // Ignore negative deltas
    if (delta_ms < 0.0) return;

    const x: f64 = @floatCast(delta_ms);

    // --- Welford update ---
    n += 1;
    const delta = x - mean;
    mean += delta / @as(f64, @floatFromInt(n));
    const delta2 = x - mean;
    m2 += delta * delta2;

    // --- Min / Max ---
    if (x < min_val) min_val = x;
    if (x > max_val) max_val = x;

    // --- Histogram update ---
    var bin: usize = @intFromFloat(x / 10.0);
    if (bin >= 20) {
        bin = 19;
        overflow_flag = 1;
    }
    histogram[bin] += 1;
}

/// Return the running mean as f32.
export fn get_mean() f32 {
    return @floatCast(mean);
}

/// Return the sample variance (m2 / (n-1)) as f32.
/// Returns 0.0 when fewer than 2 samples have been observed.
export fn get_variance() f32 {
    if (n < 2) return 0.0;
    return @floatCast(m2 / @as(f64, @floatFromInt(n - 1)));
}

/// Return the sample standard deviation (sqrt of variance) as f32.
/// Returns 0.0 when fewer than 2 samples have been observed.
export fn get_stddev() f32 {
    if (n < 2) return 0.0;
    const variance = m2 / @as(f64, @floatFromInt(n - 1));
    return @floatCast(@sqrt(variance));
}

/// Return the number of samples observed so far.
export fn get_count() u32 {
    return n;
}

/// Return a pointer to the histogram array, allowing JavaScript to
/// create a zero-copy Uint32Array view into WASM linear memory.
export fn get_histogram_ptr() [*]u32 {
    return &histogram;
}

/// Return the overflow flag (1 if any value >= 200ms was observed).
export fn get_overflow() u8 {
    return overflow_flag;
}

/// Zero all state, returning the engine to its initial condition.
export fn reset() void {
    n = 0;
    mean = 0.0;
    m2 = 0.0;
    min_val = std.math.inf(f64);
    max_val = -std.math.inf(f64);
    histogram = [_]u32{0} ** 20;
    overflow_flag = 0;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

const testing = std.testing;

test "single value has zero variance" {
    reset();
    update(100.0);
    try testing.expectEqual(@as(u32, 1), get_count());
    try testing.expectApproxEqAbs(@as(f32, 100.0), get_mean(), 0.001);
    try testing.expectEqual(@as(f32, 0.0), get_variance());
    try testing.expectEqual(@as(f32, 0.0), get_stddev());
}

test "two identical values have zero variance" {
    reset();
    update(50.0);
    update(50.0);
    try testing.expectEqual(@as(u32, 2), get_count());
    try testing.expectApproxEqAbs(@as(f32, 50.0), get_mean(), 0.001);
    try testing.expectApproxEqAbs(@as(f32, 0.0), get_variance(), 0.001);
    try testing.expectApproxEqAbs(@as(f32, 0.0), get_stddev(), 0.001);
}

test "known values produce correct mean and variance" {
    reset();
    update(10.0);
    update(20.0);
    update(30.0);
    try testing.expectApproxEqAbs(@as(f32, 20.0), get_mean(), 0.001);
    // Sample variance = ((10-20)^2 + (20-20)^2 + (30-20)^2) / (3-1) = 200/2 = 100
    try testing.expectApproxEqAbs(@as(f32, 100.0), get_variance(), 0.01);
    // stddev = sqrt(100) = 10
    try testing.expectApproxEqAbs(@as(f32, 10.0), get_stddev(), 0.01);
}

test "negative delta ignored" {
    reset();
    update(50.0);
    update(-10.0);
    try testing.expectEqual(@as(u32, 1), get_count());
}

test "reset clears state" {
    reset();
    update(42.0);
    update(84.0);
    reset();
    try testing.expectEqual(@as(u32, 0), get_count());
    try testing.expectApproxEqAbs(@as(f32, 0.0), get_mean(), 0.001);
}

test "histogram: value 55ms goes into bin 5" {
    reset();
    update(55.0);
    try testing.expectEqual(@as(u32, 1), histogram[5]);
    // Verify all other bins are zero
    var sum: u32 = 0;
    for (histogram) |v| sum += v;
    try testing.expectEqual(@as(u32, 1), sum);
}

test "histogram: value 0ms goes into bin 0" {
    reset();
    update(0.0);
    try testing.expectEqual(@as(u32, 1), histogram[0]);
}

test "histogram: value 199ms goes into bin 19" {
    reset();
    update(199.0);
    try testing.expectEqual(@as(u32, 1), histogram[19]);
}

test "histogram: value 999ms clamps to bin 19" {
    reset();
    update(999.0);
    try testing.expectEqual(@as(u32, 1), histogram[19]);
    try testing.expectEqual(@as(u8, 1), get_overflow());
}

test "histogram: multiple values distribute correctly" {
    reset();
    update(15.0);
    update(15.0);
    update(85.0);
    // 15ms -> bin 1 (15/10 = 1.5 -> truncated to 1)
    try testing.expectEqual(@as(u32, 2), histogram[1]);
    // 85ms -> bin 8 (85/10 = 8.5 -> truncated to 8)
    try testing.expectEqual(@as(u32, 1), histogram[8]);
}

test "histogram: reset clears bins" {
    reset();
    update(55.0);
    update(105.0);
    reset();
    var sum: u32 = 0;
    for (histogram) |v| sum += v;
    try testing.expectEqual(@as(u32, 0), sum);
    try testing.expectEqual(@as(u8, 0), get_overflow());
}
