from django.apps import AppConfig

class SeuAppConfig(AppConfig):
    name = 'SmartDayApp'  # ajuste para o nome real do seu app

    def ready(self):
        # importa signals para que sejam registrados
        import SmartDayApp.signals  # noqa

class SmartdayappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'SmartDayApp'
