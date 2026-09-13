using System.Globalization;
using System.Text.RegularExpressions;

namespace PhoneCam;

sealed record CameraInfo(string Id, string Facing, int SensorWidth, int SensorHeight, int[] Fps, double ZoomMin, double ZoomMax, string[] Sizes)
{
    // "    --camera-id=0    (back, 4096x3072, fps={10, 15, 20, 30}, zoom-range=[0,6, 10])"
    static readonly Regex CameraLine = new(@"--camera-id=(\S+)\s+\((\w+), (\d+)x(\d+)(?:, fps=[{\[]([^}\]]*)[}\]])?(?:, zoom-range=\[([^\]]*)\])?\)");
    static readonly Regex SizeLine = new(@"^\s+- (\d+)x(\d+)\s*$");

    /// <summary>Parses the output of scrcpy-server with list_cameras=true list_camera_sizes=true.</summary>
    public static List<CameraInfo> Parse(string output)
    {
        var cameras = new List<CameraInfo>();
        CameraInfo? current = null;
        var sizes = new List<string>();
        bool inHighSpeedSection = false;

        void Flush()
        {
            if (current != null)
                cameras.Add(current with { Sizes = [.. sizes] });
        }

        foreach (var raw in output.Split('\n'))
        {
            var line = raw.TrimEnd('\r');
            var match = CameraLine.Match(line);
            if (match.Success)
            {
                Flush();
                // The zoom range uses the phone's locale ("0,6"), but values are separated by ", ".
                var zoom = match.Groups[6].Success
                    ? match.Groups[6].Value.Split(", ").Select(ParseLocaleNumber).ToArray()
                    : [1.0, 1.0];
                current = new CameraInfo(
                    match.Groups[1].Value,
                    match.Groups[2].Value,
                    int.Parse(match.Groups[3].Value),
                    int.Parse(match.Groups[4].Value),
                    match.Groups[5].Success
                        ? match.Groups[5].Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(int.Parse).ToArray()
                        : [],
                    zoom[0],
                    zoom.Length > 1 ? zoom[1] : zoom[0],
                    []);
                sizes.Clear();
                inHighSpeedSection = false;
                continue;
            }
            if (line.Contains("High speed capture"))
            {
                inHighSpeedSection = true;
                continue;
            }
            if (current != null && !inHighSpeedSection)
            {
                var size = SizeLine.Match(line);
                if (size.Success)
                    sizes.Add($"{size.Groups[1].Value}x{size.Groups[2].Value}");
            }
        }
        Flush();
        return cameras;
    }

    /// <summary>Keeps the requested size if the camera declares it, otherwise prefers 1080p.</summary>
    /// <remarks>Only 16:9 and 4:3 sizes count, the same ones the page offers.</remarks>
    public string PickSize(string? requested)
    {
        if (requested != null && Sizes.Contains(requested))
            return requested;
        var landscape = Sizes
            .Select(s => s.Split('x').Select(int.Parse).ToArray())
            .Where(wh => wh[0] >= 640 && (Math.Abs((double)wh[0] / wh[1] - 16.0 / 9) < 0.02 || Math.Abs((double)wh[0] / wh[1] - 4.0 / 3) < 0.02))
            .OrderByDescending(wh => wh[0] * wh[1])
            .ToList();
        var chosen = landscape.FirstOrDefault(wh => wh[0] == 1920 && wh[1] == 1080)
            ?? landscape.FirstOrDefault(wh => wh[0] <= 1920)
            ?? landscape.FirstOrDefault();
        return chosen != null ? $"{chosen[0]}x{chosen[1]}" : "1920x1080";
    }

    static double ParseLocaleNumber(string text) =>
        double.TryParse(text.Trim().Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out var value) ? value : 1.0;
}
