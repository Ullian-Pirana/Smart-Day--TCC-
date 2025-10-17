from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.models import User, Group
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import logout, authenticate, login
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils.dateparse import parse_date
from django.core.serializers import serialize
from django.http import JsonResponse
from django.utils.timezone import now
from django.db import IntegrityError
from datetime import datetime, date
from .models import *
import json

def is_responsavel(user):
    return user.groups.filter(name="Responsavel").exists()

def Homepage(request):
    context = {}
    dados_home = homepage.objects.all()
    context['dados_home'] = dados_home
    return render(request, 'homepage.html', context)

#login relate
def Login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            messages.success(request, f"Login realizado com sucesso! Bem-vindo, {user.username}. ✅")
            return redirect('homepage')
        else:
            messages.error(request, "Usuário ou senha inválida. ❌")
            return render(request, 'Login.html')
    return render(request, 'Login.html')

@login_required
def Sair(request):
    logout(request)
    messages.success(request, "Logout realizado com sucesso! 👋")
    return redirect('homepage')
#end login related

#todo page fuctions
@login_required
def todo_page(request):
    return render(request, 'todo.html')

@login_required
def listar_tarefas(request):
    data = request.GET.get('data')
    if not data:
        return JsonResponse({'erro': 'Data não informada'}, status=400)

    data_obj = parse_date(data)

    tarefas = Tarefa.objects.filter(
        data_inicio__lte=data_obj,
        data_fim__gte=data_obj
    ).order_by('concluida', 'data_fim')

    tarefas_json = [
        {
            'id': t.id,
            'titulo': t.titulo,
            'descricao': t.descricao,
            'concluida': t.concluida,
            'data_inicio': t.data_inicio.strftime('%Y-%m-%d'),
            'data_fim': t.data_fim.strftime('%Y-%m-%d'),
            'criado_por': t.criado_por.username,
        }
        for t in tarefas
    ]

    return JsonResponse({'tarefas': tarefas_json})

@login_required
@require_POST
def criar_tarefa(request):
    data = json.loads(request.body)
    try:
        tarefa = Tarefa.objects.create(
            titulo=data.get('titulo'),
            descricao=data.get('descricao', ''),
            data_inicio=parse_date(data.get('data_inicio')),
            data_fim=parse_date(data.get('data_fim')),
            criado_por=request.user,
        )
        return JsonResponse({'mensagem': 'Tarefa criada com sucesso!'})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=400)
    
from django.views.decorators.http import require_http_methods

from django.views.decorators.http import require_POST

@require_POST
@login_required
def excluir_tarefa(request, id):
    try:
        tarefa = Tarefa.objects.get(id=id, criado_por=request.user)
        tarefa.delete()
        return JsonResponse({"status": "ok"})
    except Tarefa.DoesNotExist:
        return JsonResponse({"erro": "Tarefa não encontrada."}, status=404)

@login_required
@require_POST
def atualizar_status(request, id):
    try:
        tarefa = Tarefa.objects.get(id=id)
        tarefa.concluida = not tarefa.concluida
        tarefa.save()
        return JsonResponse({'status': tarefa.concluida})
    except Tarefa.DoesNotExist:
        return JsonResponse({'erro': 'Tarefa não encontrada'}, status=404)
#end todo page fuctions