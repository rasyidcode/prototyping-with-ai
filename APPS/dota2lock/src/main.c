#define _POSIX_C_SOURCE 200809L

#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <glib.h>
#include <gtk/gtk.h>
#include <signal.h>
#include <stdbool.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

#define DEFAULT_INTERVAL_SECONDS 3
#define MAX_PROC_TEXT 8192
#define STATUS_TEXT_MAX 256

typedef struct {
    int interval_seconds;
    bool dry_run;
    bool run_once;
} AppConfig;

typedef struct {
    bool allowed_now;
    bool success;
    int actions;
    char summary[STATUS_TEXT_MAX];
} EnforcementResult;

typedef struct {
    GtkApplication *application;
    AppConfig config;
    GtkWidget *window;
    GtkWidget *state_value;
    GtkWidget *summary_value;
    GtkWidget *actions_value;
    GtkWidget *dry_run_check;
    GtkWidget *interval_spin;
    guint timer_id;
} AppState;

static const int ALLOWED_DAYS[] = {
    0,
    6
};

static const char *DOTA_TOKENS[] = {
    "dota2",
    "dota 2",
    "dota_linux",
    "dota.sh",
    "game/dota",
    "rungameid/570",
    "appmanifest_570"
};

static void log_timestamp(FILE *stream) {
    time_t now = time(NULL);
    struct tm local_tm;
    char buffer[64];

    if (localtime_r(&now, &local_tm) == NULL) {
        fprintf(stream, "[time-error] ");
        return;
    }

    if (strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &local_tm) == 0) {
        fprintf(stream, "[time-format-error] ");
        return;
    }

    fprintf(stream, "[%s] ", buffer);
}

static bool is_allowed_weekday(int tm_wday) {
    size_t i;

    for (i = 0; i < sizeof(ALLOWED_DAYS) / sizeof(ALLOWED_DAYS[0]); i++) {
        if (tm_wday == ALLOWED_DAYS[i]) {
            return true;
        }
    }

    return false;
}

static bool is_allowed_now(void) {
    time_t now = time(NULL);
    struct tm local_tm;

    if (now == (time_t)-1) {
        log_timestamp(stderr);
        fprintf(stderr, "failed to read current time\n");
        return false;
    }

    if (localtime_r(&now, &local_tm) == NULL) {
        log_timestamp(stderr);
        fprintf(stderr, "failed to convert current time to localtime\n");
        return false;
    }

    return is_allowed_weekday(local_tm.tm_wday);
}

static void lowercase_copy(const char *src, char *dst, size_t dst_size) {
    size_t i;

    if (dst_size == 0) {
        return;
    }

    for (i = 0; i + 1 < dst_size && src[i] != '\0'; i++) {
        dst[i] = (char)tolower((unsigned char)src[i]);
    }
    dst[i] = '\0';
}

static bool read_proc_text(const char *path, char *buffer, size_t buffer_size) {
    FILE *file;
    size_t bytes_read;
    size_t i;

    if (buffer_size == 0) {
        return false;
    }

    file = fopen(path, "rb");
    if (file == NULL) {
        return false;
    }

    bytes_read = fread(buffer, 1, buffer_size - 1, file);
    if (ferror(file)) {
        fclose(file);
        return false;
    }
    fclose(file);

    for (i = 0; i < bytes_read; i++) {
        if (buffer[i] == '\0') {
            buffer[i] = ' ';
        }
    }

    buffer[bytes_read] = '\0';
    return true;
}

static bool looks_like_dota_process(const char *comm, const char *cmdline) {
    size_t i;
    char comm_lower[MAX_PROC_TEXT];
    char cmdline_lower[MAX_PROC_TEXT];

    lowercase_copy(comm, comm_lower, sizeof(comm_lower));
    lowercase_copy(cmdline, cmdline_lower, sizeof(cmdline_lower));

    for (i = 0; i < sizeof(DOTA_TOKENS) / sizeof(DOTA_TOKENS[0]); i++) {
        if (strstr(comm_lower, DOTA_TOKENS[i]) != NULL || strstr(cmdline_lower, DOTA_TOKENS[i]) != NULL) {
            return true;
        }
    }

    return false;
}

static bool is_numeric_dirname(const char *name) {
    size_t i;

    if (name[0] == '\0') {
        return false;
    }

    for (i = 0; name[i] != '\0'; i++) {
        if (!isdigit((unsigned char)name[i])) {
            return false;
        }
    }

    return true;
}

static int enforce_blocked_policy(bool dry_run, char *summary, size_t summary_size) {
    DIR *proc_dir;
    struct dirent *entry;
    int action_count = 0;
    pid_t self_pid = getpid();

    proc_dir = opendir("/proc");
    if (proc_dir == NULL) {
        log_timestamp(stderr);
        fprintf(stderr, "failed to open /proc: %s\n", strerror(errno));
        return -1;
    }

    while ((entry = readdir(proc_dir)) != NULL) {
        char comm_path[PATH_MAX];
        char cmdline_path[PATH_MAX];
        char comm[MAX_PROC_TEXT];
        char cmdline[MAX_PROC_TEXT];
        pid_t pid;

        if (!is_numeric_dirname(entry->d_name)) {
            continue;
        }

        pid = (pid_t)strtol(entry->d_name, NULL, 10);
        if (pid <= 0 || pid == self_pid) {
            continue;
        }

        (void)snprintf(comm_path, sizeof(comm_path), "/proc/%s/comm", entry->d_name);
        (void)snprintf(cmdline_path, sizeof(cmdline_path), "/proc/%s/cmdline", entry->d_name);

        if (!read_proc_text(comm_path, comm, sizeof(comm))) {
            continue;
        }
        if (!read_proc_text(cmdline_path, cmdline, sizeof(cmdline))) {
            cmdline[0] = '\0';
        }

        if (!looks_like_dota_process(comm, cmdline)) {
            continue;
        }

        if (dry_run) {
            log_timestamp(stdout);
            printf("[dry-run] would terminate PID=%ld comm=\"%s\"\n", (long)pid, comm);
            action_count++;
            continue;
        }

        if (kill(pid, SIGTERM) == 0) {
            log_timestamp(stdout);
            printf("terminated blocked Dota process PID=%ld comm=\"%s\"\n", (long)pid, comm);
            action_count++;
        } else {
            log_timestamp(stderr);
            fprintf(stderr, "failed to terminate PID=%ld comm=\"%s\": %s\n", (long)pid, comm, strerror(errno));
        }
    }

    if (closedir(proc_dir) != 0) {
        log_timestamp(stderr);
        fprintf(stderr, "failed to close /proc handle: %s\n", strerror(errno));
        return -1;
    }

    if (summary_size > 0) {
        if (action_count == 0) {
            (void)snprintf(summary, summary_size, dry_run ? "No Dota 2 processes matched." : "No Dota 2 processes needed termination.");
        } else if (dry_run) {
            (void)snprintf(summary, summary_size, "Dry run matched %d Dota 2 process%s.", action_count, action_count == 1 ? "" : "es");
        } else {
            (void)snprintf(summary, summary_size, "Terminated %d blocked Dota 2 process%s.", action_count, action_count == 1 ? "" : "es");
        }
    }

    return action_count;
}

static bool perform_cycle(const AppConfig *config, EnforcementResult *result) {
    int actions;

    memset(result, 0, sizeof(*result));
    result->allowed_now = is_allowed_now();

    if (result->allowed_now) {
        result->success = true;
        (void)snprintf(result->summary, sizeof(result->summary), "Weekend window is open; the blocker is idle.");
        return true;
    }

    actions = enforce_blocked_policy(config->dry_run, result->summary, sizeof(result->summary));
    if (actions < 0) {
        result->success = false;
        (void)snprintf(result->summary, sizeof(result->summary), "Enforcement failed while checking /proc.");
        return false;
    }

    result->actions = actions;
    result->success = true;
    return true;
}

static void print_usage(const char *program_name) {
    fprintf(stderr,
            "Usage: %s [--interval SECONDS] [--dry-run] [--once]\n"
            "  --interval SECONDS  Monitoring interval in seconds (default: %d)\n"
            "  --dry-run           Log what would be terminated without killing processes\n"
            "  --once              Run one check and exit\n",
            program_name,
            DEFAULT_INTERVAL_SECONDS);
}

static bool parse_int(const char *text, int *out_value) {
    long value;
    char *endptr = NULL;

    errno = 0;
    value = strtol(text, &endptr, 10);
    if (errno != 0 || endptr == text || *endptr != '\0') {
        return false;
    }
    if (value <= 0 || value > 3600) {
        return false;
    }

    *out_value = (int)value;
    return true;
}

static bool parse_args(int argc, char **argv, AppConfig *config) {
    int i;

    config->interval_seconds = DEFAULT_INTERVAL_SECONDS;
    config->dry_run = false;
    config->run_once = false;

    for (i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--dry-run") == 0) {
            config->dry_run = true;
        } else if (strcmp(argv[i], "--once") == 0) {
            config->run_once = true;
        } else if (strcmp(argv[i], "--interval") == 0) {
            if (i + 1 >= argc) {
                log_timestamp(stderr);
                fprintf(stderr, "missing value for --interval\n");
                return false;
            }
            if (!parse_int(argv[i + 1], &config->interval_seconds)) {
                log_timestamp(stderr);
                fprintf(stderr, "invalid interval: %s (must be 1..3600)\n", argv[i + 1]);
                return false;
            }
            i++;
        } else {
            log_timestamp(stderr);
            fprintf(stderr, "unknown argument: %s\n", argv[i]);
            return false;
        }
    }

    return true;
}

static void update_ui_from_result(AppState *state, const EnforcementResult *result) {
    gchar *state_markup;
    const char *state_text;
    const char *mode_text;
    char actions_text[128];
    char tooltip_text[128];

    state_text = result->success ? (result->allowed_now ? "Allowed" : "Blocked") : "Error";
    state_markup = g_markup_printf_escaped("<span size='x-large' weight='bold'>%s</span>", state_text);
    gtk_label_set_markup(GTK_LABEL(state->state_value), state_markup);
    g_free(state_markup);

    gtk_label_set_text(GTK_LABEL(state->summary_value), result->summary);

    if (result->allowed_now) {
        (void)snprintf(actions_text, sizeof(actions_text), "No block actions were needed.");
    } else if (!result->success) {
        (void)snprintf(actions_text, sizeof(actions_text), "The last enforcement cycle failed.");
    } else if (result->actions == 0) {
        (void)snprintf(actions_text, sizeof(actions_text), "No matching Dota 2 processes were found.");
    } else {
        (void)snprintf(actions_text, sizeof(actions_text), "%d process%s handled in the last cycle.", result->actions, result->actions == 1 ? "" : "es");
    }
    gtk_label_set_text(GTK_LABEL(state->actions_value), actions_text);

    mode_text = state->config.dry_run ? "Dry run" : "Active enforcement";
    (void)snprintf(tooltip_text, sizeof(tooltip_text), "%s | interval %d second%s", mode_text, state->config.interval_seconds, state->config.interval_seconds == 1 ? "" : "s");
    gtk_widget_set_tooltip_text(state->window, tooltip_text);
}

static void sync_config_from_ui(AppState *state) {
    state->config.dry_run = gtk_toggle_button_get_active(GTK_TOGGLE_BUTTON(state->dry_run_check));
    state->config.interval_seconds = gtk_spin_button_get_value_as_int(GTK_SPIN_BUTTON(state->interval_spin));
}

static gboolean timer_tick(gpointer user_data) {
    AppState *state = (AppState *)user_data;
    EnforcementResult result;

    sync_config_from_ui(state);
    if (!perform_cycle(&state->config, &result)) {
        result.success = false;
    }
    update_ui_from_result(state, &result);
    return G_SOURCE_CONTINUE;
}

static void restart_timer(AppState *state) {
    if (state->timer_id != 0) {
        g_source_remove(state->timer_id);
        state->timer_id = 0;
    }

    state->timer_id = g_timeout_add_seconds((guint)state->config.interval_seconds, timer_tick, state);
}

static void run_and_render_cycle(AppState *state) {
    EnforcementResult result;

    sync_config_from_ui(state);
    if (!perform_cycle(&state->config, &result)) {
        result.success = false;
    }
    update_ui_from_result(state, &result);
}

static void on_check_now_clicked(GtkButton *button, gpointer user_data) {
    (void)button;
    run_and_render_cycle((AppState *)user_data);
}

static void on_dry_run_toggled(GtkToggleButton *button, gpointer user_data) {
    AppState *state = (AppState *)user_data;

    (void)button;
    sync_config_from_ui(state);
    run_and_render_cycle(state);
}

static void on_interval_changed(GtkSpinButton *spin_button, gpointer user_data) {
    AppState *state = (AppState *)user_data;

    (void)spin_button;
    sync_config_from_ui(state);
    restart_timer(state);
    run_and_render_cycle(state);
}

static void on_window_destroy(GtkWidget *widget, gpointer user_data) {
    AppState *state = (AppState *)user_data;

    (void)widget;
    if (state->timer_id != 0) {
        g_source_remove(state->timer_id);
        state->timer_id = 0;
    }

    g_application_quit(G_APPLICATION(state->application));
}

static GtkWidget *make_value_label(const char *text) {
    GtkWidget *label;

    label = gtk_label_new(text);
    gtk_label_set_xalign(GTK_LABEL(label), 0.0f);
    gtk_label_set_line_wrap(GTK_LABEL(label), TRUE);
    return label;
}

static void build_ui(GtkApplication *application, AppState *state) {
    GtkWidget *window;
    GtkWidget *root;
    GtkWidget *title;
    GtkWidget *subtitle;
    GtkWidget *status_frame;
    GtkWidget *status_grid;
    GtkWidget *controls_frame;
    GtkWidget *controls_grid;
    GtkWidget *state_label;
    GtkWidget *summary_label;
    GtkWidget *actions_label;
    GtkWidget *dry_run_label;
    GtkWidget *interval_label;
    GtkAdjustment *adjustment;
    GtkWidget *buttons_box;
    GtkWidget *check_button;
    GtkWidget *quit_button;

    window = gtk_application_window_new(application);
    gtk_window_set_title(GTK_WINDOW(window), "dota2lock");
    gtk_window_set_default_size(GTK_WINDOW(window), 520, 320);
    gtk_container_set_border_width(GTK_CONTAINER(window), 16);

    root = gtk_box_new(GTK_ORIENTATION_VERTICAL, 12);
    gtk_container_add(GTK_CONTAINER(window), root);

    title = gtk_label_new(NULL);
    gtk_label_set_markup(GTK_LABEL(title), "<span size='xx-large' weight='bold'>dota2lock</span>");
    gtk_label_set_xalign(GTK_LABEL(title), 0.0f);
    gtk_box_pack_start(GTK_BOX(root), title, FALSE, FALSE, 0);

    subtitle = make_value_label("Blocks Dota 2 on weekdays and keeps enforcing without freezing the UI.");
    gtk_box_pack_start(GTK_BOX(root), subtitle, FALSE, FALSE, 0);

    status_frame = gtk_frame_new("Status");
    gtk_box_pack_start(GTK_BOX(root), status_frame, FALSE, FALSE, 0);

    status_grid = gtk_grid_new();
    gtk_grid_set_row_spacing(GTK_GRID(status_grid), 8);
    gtk_grid_set_column_spacing(GTK_GRID(status_grid), 12);
    gtk_container_set_border_width(GTK_CONTAINER(status_grid), 12);
    gtk_container_add(GTK_CONTAINER(status_frame), status_grid);

    state_label = make_value_label("Current state");
    gtk_widget_set_halign(state_label, GTK_ALIGN_START);
    gtk_grid_attach(GTK_GRID(status_grid), state_label, 0, 0, 1, 1);

    state->state_value = make_value_label("Starting...");
    gtk_grid_attach(GTK_GRID(status_grid), state->state_value, 1, 0, 1, 1);

    summary_label = make_value_label("Latest summary");
    gtk_widget_set_halign(summary_label, GTK_ALIGN_START);
    gtk_grid_attach(GTK_GRID(status_grid), summary_label, 0, 1, 1, 1);

    state->summary_value = make_value_label("Waiting for the first enforcement cycle.");
    gtk_grid_attach(GTK_GRID(status_grid), state->summary_value, 1, 1, 1, 1);

    actions_label = make_value_label("Last actions");
    gtk_widget_set_halign(actions_label, GTK_ALIGN_START);
    gtk_grid_attach(GTK_GRID(status_grid), actions_label, 0, 2, 1, 1);

    state->actions_value = make_value_label("No cycle has run yet.");
    gtk_grid_attach(GTK_GRID(status_grid), state->actions_value, 1, 2, 1, 1);

    controls_frame = gtk_frame_new("Controls");
    gtk_box_pack_start(GTK_BOX(root), controls_frame, FALSE, FALSE, 0);

    controls_grid = gtk_grid_new();
    gtk_grid_set_row_spacing(GTK_GRID(controls_grid), 8);
    gtk_grid_set_column_spacing(GTK_GRID(controls_grid), 12);
    gtk_container_set_border_width(GTK_CONTAINER(controls_grid), 12);
    gtk_container_add(GTK_CONTAINER(controls_frame), controls_grid);

    dry_run_label = make_value_label("Dry run");
    gtk_grid_attach(GTK_GRID(controls_grid), dry_run_label, 0, 0, 1, 1);

    state->dry_run_check = gtk_check_button_new_with_label("Log intended terminations without killing anything");
    gtk_toggle_button_set_active(GTK_TOGGLE_BUTTON(state->dry_run_check), state->config.dry_run);
    g_signal_connect(state->dry_run_check, "toggled", G_CALLBACK(on_dry_run_toggled), state);
    gtk_grid_attach(GTK_GRID(controls_grid), state->dry_run_check, 1, 0, 1, 1);

    interval_label = make_value_label("Interval (seconds)");
    gtk_grid_attach(GTK_GRID(controls_grid), interval_label, 0, 1, 1, 1);

    adjustment = gtk_adjustment_new((gdouble)state->config.interval_seconds, 1.0, 3600.0, 1.0, 10.0, 0.0);
    state->interval_spin = gtk_spin_button_new(adjustment, 1.0, 0);
    g_signal_connect(state->interval_spin, "value-changed", G_CALLBACK(on_interval_changed), state);
    gtk_grid_attach(GTK_GRID(controls_grid), state->interval_spin, 1, 1, 1, 1);

    buttons_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 8);
    gtk_grid_attach(GTK_GRID(controls_grid), buttons_box, 1, 2, 1, 1);

    check_button = gtk_button_new_with_label("Check now");
    g_signal_connect(check_button, "clicked", G_CALLBACK(on_check_now_clicked), state);
    gtk_box_pack_start(GTK_BOX(buttons_box), check_button, FALSE, FALSE, 0);

    quit_button = gtk_button_new_with_label("Quit");
    g_signal_connect_swapped(quit_button, "clicked", G_CALLBACK(g_application_quit), application);
    gtk_box_pack_start(GTK_BOX(buttons_box), quit_button, FALSE, FALSE, 0);

    g_signal_connect(window, "destroy", G_CALLBACK(on_window_destroy), state);

    state->window = window;
    gtk_widget_show_all(window);
}

static void activate(GtkApplication *application, gpointer user_data) {
    AppState *state = (AppState *)user_data;

    state->application = application;
    build_ui(application, state);
    restart_timer(state);
    run_and_render_cycle(state);
}

static int run_headless_once(const AppConfig *config) {
    EnforcementResult result;
    bool ok;

    ok = perform_cycle(config, &result);
    if (ok) {
        log_timestamp(stdout);
        printf("%s\n", result.summary);
        if (!result.allowed_now && result.actions > 0) {
            log_timestamp(stdout);
            printf("actions=%d\n", result.actions);
        }
        return 0;
    }

    log_timestamp(stderr);
    fprintf(stderr, "%s\n", result.summary);
    return 1;
}

int main(int argc, char **argv) {
    AppConfig config;
    AppState state;
    GtkApplication *application;
    int status;

    if (!parse_args(argc, argv, &config)) {
        print_usage(argv[0]);
        return 2;
    }

    if (config.run_once) {
        return run_headless_once(&config);
    }

    memset(&state, 0, sizeof(state));
    state.config = config;

    application = gtk_application_new("com.example.dota2lock", G_APPLICATION_DEFAULT_FLAGS);
    g_signal_connect(application, "activate", G_CALLBACK(activate), &state);

    log_timestamp(stdout);
    printf("dota2lock started (weekdays blocked; interval=%ds%s)\n", config.interval_seconds, config.dry_run ? ", dry-run" : "");

    status = g_application_run(G_APPLICATION(application), argc, argv);

    if (state.timer_id != 0) {
        g_source_remove(state.timer_id);
        state.timer_id = 0;
    }

    g_object_unref(application);

    log_timestamp(stdout);
    printf("dota2lock stopped\n");
    return status;
}
