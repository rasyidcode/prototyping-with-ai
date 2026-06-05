extends CanvasLayer

@onready var interaction_label = $InteractionPrompt/Label
@onready var interaction_prompt = $InteractionPrompt
@onready var battery_bar = $HUDOverlay/BatteryContainer/BatteryBar
@onready var note_viewer = $NoteViewer
@onready var note_text = $NoteViewer/Paper/NoteText
@onready var screen_fade = $ScreenFade
@onready var win_overlay = $WinOverlay
@onready var loss_overlay = $LossOverlay

var is_note_open = false

signal note_closed

func _ready() -> void:
	interaction_prompt.hide()
	note_viewer.hide()
	win_overlay.hide()
	loss_overlay.hide()
	
	# Fade in at start
	screen_fade.color = Color.BLACK
	screen_fade.show()
	var tween = create_tween()
	tween.tween_property(screen_fade, "color:a", 0.0, 1.5)
	await tween.finished
	screen_fade.hide()

func show_interaction_prompt(text: String) -> void:
	interaction_label.text = text
	interaction_prompt.show()

func hide_interaction_prompt() -> void:
	interaction_prompt.hide()

func update_battery(value: float) -> void:
	battery_bar.value = value
	if value < 20.0:
		battery_bar.modulate = Color.RED
	else:
		battery_bar.modulate = Color.WHITE

func show_note(text: String) -> void:
	note_text.text = text
	note_viewer.show()
	is_note_open = true
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func close_note() -> void:
	note_viewer.hide()
	is_note_open = false
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	note_closed.emit()

func trigger_scare_flash() -> void:
	# Flash screen red and quickly fade out
	screen_fade.show()
	screen_fade.color = Color(1, 0, 0, 0.6)
	var tween = create_tween()
	tween.tween_property(screen_fade, "color:a", 0.0, 0.8)
	await tween.finished
	screen_fade.hide()

func show_win_screen() -> void:
	win_overlay.show()
	win_overlay.modulate.a = 0.0
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var tween = create_tween().set_bool_loop(false)
	tween.tween_property(win_overlay, "modulate:a", 1.0, 1.5)

func show_loss_screen() -> void:
	loss_overlay.show()
	loss_overlay.modulate.a = 0.0
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var tween = create_tween().set_bool_loop(false)
	tween.tween_property(loss_overlay, "modulate:a", 1.0, 1.5)

func _on_restart_pressed() -> void:
	get_tree().paused = false
	get_tree().reload_current_scene()

func _on_menu_pressed() -> void:
	get_tree().paused = false
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
