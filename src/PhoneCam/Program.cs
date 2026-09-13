namespace PhoneCam;

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        try
        {
            AppFiles.Prepare();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"PhoneCam non riesce a preparare i suoi file in {Settings.Folder}.\n\n{ex.Message}",
                "PhoneCam", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }
        Application.Run(new MainForm(args));
    }
}
