using System.Diagnostics;
using System.Net.Sockets;
using System.Text;

namespace PhoneCam;

sealed record AdbDevice(string Serial, string State, string Model);

/// <summary>Thin wrapper over the bundled adb.exe.</summary>
sealed class Adb(string exePath)
{
    public string ExePath { get; } = exePath;

    public static bool IsServerRunning()
    {
        try
        {
            using var client = new TcpClient();
            return client.ConnectAsync("127.0.0.1", 5037).Wait(300) && client.Connected;
        }
        catch
        {
            return false;
        }
    }

    // The daemon spawned by start-server inherits redirected pipes and keeps them open,
    // so this one call must run without redirection or it never completes.
    public async Task StartServerAsync()
    {
        var psi = new ProcessStartInfo(ExePath, "start-server") { UseShellExecute = false, CreateNoWindow = true };
        using var process = Process.Start(psi)!;
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(20));
        await process.WaitForExitAsync(timeout.Token);
    }

    public async Task<(int ExitCode, string Output)> RunAsync(string arguments, int timeoutMs = 15000)
    {
        var psi = new ProcessStartInfo(ExePath, arguments)
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        using var process = Process.Start(psi)!;
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        using var timeout = new CancellationTokenSource(timeoutMs);
        try
        {
            await process.WaitForExitAsync(timeout.Token);
        }
        catch (OperationCanceledException)
        {
            try { process.Kill(true); } catch { }
            throw new TimeoutException($"adb {arguments.Split(' ')[0]}: nessuna risposta");
        }
        return (process.ExitCode, await stdout + await stderr);
    }

    public async Task<List<AdbDevice>> DevicesAsync()
    {
        var (_, output) = await RunAsync("devices -l", 10000);
        var devices = new List<AdbDevice>();
        foreach (var raw in output.Split('\n'))
        {
            var line = raw.Trim();
            if (line.Length == 0 || line.StartsWith("List of devices") || line.StartsWith('*'))
                continue;
            var parts = line.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 2)
                continue;
            var model = parts.Skip(2).FirstOrDefault(p => p.StartsWith("model:"))?[6..].Replace('_', ' ') ?? "";
            devices.Add(new AdbDevice(parts[0], parts[1], model));
        }
        return devices;
    }

    /// <summary>Starts a long-running shell command; every output line goes to <paramref name="onLine"/>.</summary>
    public Process StartShell(string serial, string command, Action<string> onLine)
    {
        var psi = new ProcessStartInfo(ExePath, $"-s {serial} shell {command}")
        {
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
        process.OutputDataReceived += (_, e) => { if (e.Data != null) onLine(e.Data); };
        process.ErrorDataReceived += (_, e) => { if (e.Data != null) onLine(e.Data); };
        process.Start();
        process.BeginOutputReadLine();
        process.BeginErrorReadLine();
        return process;
    }
}
