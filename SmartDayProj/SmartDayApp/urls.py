from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.Homepage, name='homepage'),
    path('login', views.Login, name='login'),
    path('logout', views.Sair, name='logout'),

    #   To-do
    path('todo/', views.todo_page, name='todo'),
    path('todo/listar/', views.listar_tarefas, name='listar_tarefas'),
    path('todo/criar/', views.criar_tarefa, name='criar_tarefa'),
    path('todo/status/<int:id>/', views.atualizar_status, name='atualizar_status'),
    path('todo/excluir/<int:id>/', views.excluir_tarefa, name='excluir_tarefa'),
    path('todo/editar/<int:id>/', views.editar_tarefa, name='editar_tarefa'),

    #   Gerenciamento de Casas
    path('minhacasa/', views.minha_casa_page, name='minha_casa'),
    path('casa/criar/', views.criar_casa, name='criar_casa'),
    path('casa/<int:id>/gerenciar/', views.gerenciar_casa, name='gerenciar_casa'),
    path('casa/<int:id>/adicionar_usuario/', views.adicionar_usuario_casa, name='adicionar_usuario_casa'),
    path('casa/<int:id>/remover_usuario/<int:user_id>/', views.remover_usuario_casa, name='remover_usuario_casa'),
    path('casa/<int:id>/editar/', views.editar_casa, name='editar_casa'),
    path('casa/<int:id>/excluir/', views.excluir_casa, name='excluir_casa'),
    path('casa/<int:id>/definir_papel/', views.definir_papel, name='definir_papel'),

    #   Lista de Compras
    path('compras/', views.lista_compras, name='lista_compras'),
    path('compras/listar/', views.listar_itens_compras, name='listar_itens_compras'),
    path('compras/criar/', views.criar_item, name='criar_item'),
    path('compras/editar/<int:id>/', views.editar_item, name='editar_item'),
    path('compras/excluir/<int:id>/', views.excluir_item, name='excluir_item'),
    path('compras/aprovar/<int:id>/', views.aprovar_item, name='aprovar_item'),
    path('compras/recusar/<int:id>/', views.recusar_item, name='recusar_item'),
    path('compras/status/<int:id>/', views.alternar_status_compra, name='status_item'),

    #   Finanças
    path('financas/', views.financas_page, name='financas'),
    path('financas/salvar-transacao/', views.salvar_transacao, name='salvar_transacao'),
    path('financas/grafico-mensal/', views.grafico_mensal, name='grafico_mensal'),
]