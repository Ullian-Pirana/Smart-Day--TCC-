from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.Homepage, name='homepage'),
    path('login', views.Login, name='login'),
    path('logout', views.Sair, name='logout'),

    # To-do
    path('todo/', views.todo_page, name='todo_page'),
    path('todo/listar/', views.listar_tarefas, name='listar_tarefas'),
    path('todo/criar/', views.criar_tarefa, name='criar_tarefa'),
    path('todo/status/<int:id>/', views.atualizar_status, name='atualizar_status'),
]
