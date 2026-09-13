using System.Diagnostics;
using System.Reflection;

namespace PhoneCam;

/// <summary>
/// Finds adb, scrcpy-server and the web page. A development build has them next to the executable;
/// the single-file release carries them as embedded resources and unpacks them on first start,
/// so the downloaded PhoneCam.exe runs on its own.
/// </summary>
static class AppFiles
{
    const string ResourcePrefix = "payload/";
    const string CompleteMarker = ".complete";

    public static string Root { get; private set; } = AppContext.BaseDirectory;

    public static string AdbExe => Path.Combine(Root, "tools", "adb.exe");

    public static string ServerJar => Path.Combine(Root, "tools", "scrcpy-server");

    public static string WebRoot => Path.Combine(Root, "wwwroot");

    public static void Prepare()
    {
        if (File.Exists(AdbExe) && File.Exists(Path.Combine(WebRoot, "index.html")))
            return;

        var assembly = typeof(AppFiles).Assembly;
        string appFolder = Path.Combine(Settings.Folder, "app");
        // One folder per build: a new release never runs with files unpacked by an older one.
        string target = Path.Combine(appFolder, assembly.ManifestModule.ModuleVersionId.ToString("N"));
        if (!File.Exists(Path.Combine(target, CompleteMarker)))
            Unpack(assembly, target);
        Root = target;
        RemoveOtherBuilds(appFolder, target);
    }

    static void Unpack(Assembly assembly, string target)
    {
        var names = assembly.GetManifestResourceNames().Where(n => n.StartsWith(ResourcePrefix, StringComparison.Ordinal)).ToList();
        if (names.Count == 0)
            throw new InvalidOperationException("Il file eseguibile non contiene adb né la pagina dell'app");

        // Unpack into a private folder first, so a crash or a second copy never sees half the files.
        string staging = $"{target}.tmp-{Environment.ProcessId}";
        if (Directory.Exists(staging))
            Directory.Delete(staging, true);
        foreach (string name in names)
        {
            string path = Path.Combine(staging, name[ResourcePrefix.Length..].Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            using var input = assembly.GetManifestResourceStream(name)!;
            using var output = File.Create(path);
            input.CopyTo(output);
        }
        File.WriteAllText(Path.Combine(staging, CompleteMarker), "");

        if (Directory.Exists(target) && !File.Exists(Path.Combine(target, CompleteMarker)))
            Directory.Delete(target, true); // left over by an interrupted start
        try
        {
            Directory.Move(staging, target);
        }
        catch (IOException) when (File.Exists(Path.Combine(target, CompleteMarker)))
        {
            // Another PhoneCam started at the same moment and unpacked the same build.
            Directory.Delete(staging, true);
        }
    }

    static void RemoveOtherBuilds(string appFolder, string current)
    {
        // Another running copy may still be using its own folder.
        if (Process.GetProcessesByName("PhoneCam").Length > 1)
            return;
        foreach (string folder in Directory.GetDirectories(appFolder))
        {
            if (string.Equals(folder, current, StringComparison.OrdinalIgnoreCase))
                continue;
            try
            {
                Directory.Delete(folder, true);
            }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                // An adb server left running by an older build still holds its files: try again next time.
            }
        }
    }
}
