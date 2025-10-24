from django.shortcuts import render, redirect, get_object_or_404, Http404
from django.contrib.auth.models import User, Group
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout, authenticate, login
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
from django.utils.dateparse import parse_date
from django.http import HttpResponse, JsonResponse
from django.utils.timezone import now
from django.db import IntegrityError
from datetime import datetime, date
from .models import *
from .forms import *
import json

def is_responsavel(user):
    """
    Retorna True se o usuário pertencer a um grupo 'Responsavel', 
    'Responsaveis' ou 'Responsáveis' (ignorando maiúsculas/minúsculas e acentos).
    """
    grupos = user.groups.values_list('name', flat=True)
    for nome in grupos:
        nome_normalizado = nome.lower().replace("í", "i").replace("é", "e").replace("ê", "e")
        if nome_normalizado in ("responsavel", "responsaveis"):
            return True
    return False

def Homepage(request):
    context = {'dados_home': homepage.objects.all()}
    return render(request, 'homepage.html', context)

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

    usuario = request.user.username
    is_responsavel_user = is_responsavel(request.user)

    return JsonResponse({'tarefas': tarefas_json, 'usuario': usuario, 'is_responsavel': is_responsavel_user})

@login_required
@require_POST
def criar_tarefa(request):
    data = json.loads(request.body)
    try:
        data_inicio = parse_date(data.get('data_inicio'))
        data_fim = parse_date(data.get('data_fim'))

        # 🚫 Validação de datas
        if data_inicio and data_fim and data_fim < data_inicio:
            return JsonResponse({'erro': 'A data de término não pode ser anterior à data de início.'}, status=400)

        tarefa = Tarefa.objects.create(
            titulo=data.get('titulo'),
            descricao=data.get('descricao', ''),
            data_inicio=data_inicio,
            data_fim=data_fim,
            criado_por=request.user,
        )
        return JsonResponse({'mensagem': 'Tarefa criada com sucesso!'})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=400)

@login_required
@require_POST
def excluir_tarefa(request, id):
    try:
        tarefa = Tarefa.objects.get(id=id)
        # Permissão: Responsável pode tudo, outros só se forem criadores
        if not (is_responsavel(request.user) or tarefa.criado_por == request.user):
            return JsonResponse({"erro": "Você não tem permissão para excluir esta tarefa."}, status=403)

        tarefa.delete()
        return JsonResponse({"mensagem": "Tarefa excluída com sucesso!"})
    except Tarefa.DoesNotExist:
        return JsonResponse({"erro": "Tarefa não encontrada."}, status=404)
    except Exception as e:
        return JsonResponse({"erro": str(e)}, status=400)

@login_required
@require_POST
def editar_tarefa(request, id):
    try:
        tarefa = Tarefa.objects.get(id=id)

        if not (is_responsavel(request.user) or tarefa.criado_por == request.user):
            return JsonResponse({"erro": "Você não tem permissão para editar esta tarefa."}, status=403)

        data = json.loads(request.body)
        data_inicio = parse_date(data.get("data_inicio")) or tarefa.data_inicio
        data_fim = parse_date(data.get("data_fim")) or tarefa.data_fim

        # 🚫 Validação de datas
        if data_fim < data_inicio:
            return JsonResponse({"erro": "A data de término não pode ser anterior à data de início."}, status=400)

        tarefa.titulo = data.get("titulo", tarefa.titulo)
        tarefa.descricao = data.get("descricao", tarefa.descricao)
        tarefa.data_inicio = data_inicio
        tarefa.data_fim = data_fim
        tarefa.save()

        return JsonResponse({"mensagem": "Tarefa atualizada com sucesso!"})
    except Tarefa.DoesNotExist:
        return JsonResponse({"erro": "Tarefa não encontrada."}, status=404)
    except Exception as e:
        return JsonResponse({"erro": str(e)}, status=400)

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

def toggle_theme(request):
    request.session['dark_mode'] = not request.session.get('dark_mode', False)
    return HttpResponse('OK')

@login_required
def minha_casa_page(request):
    # Lista casas que o usuário criou ou participa
    casas = Casa.objects.filter(models.Q(dono=request.user) | models.Q(membros=request.user)).distinct()
    return render(request, 'minha_casa.html', {'casas': casas})

@login_required
def criar_casa(request):
    if request.method == 'POST':
        form = CasaForm(request.POST)
        if form.is_valid():
            nome = form.cleaned_data['nome']
            casa = Casa.objects.create(nome=nome, dono=request.user)
            group, created = Group.objects.get_or_create(name=nome)

            request.user.groups.add(group)
            messages.success(request, f'Casa "{casa.nome}" criada com sucesso.')
            return redirect('gerenciar_casa', id=casa.id)
    else:
        form = CasaForm()
    return render(request, 'casa_create.html', {'form': form})

@login_required
def gerenciar_casa(request, id):
    casa = get_object_or_404(Casa, id=id)

    if not (casa.dono == request.user or is_responsavel(request.user)):
        messages.error(request, "Você não tem permissão para gerenciar esta casa.")
        return redirect('homepage')

    membros = casa.membros.all()
    todos_usuarios = User.objects.exclude(id__in=membros.values_list('id', flat=True))
    add_form = AddUserForm()

    return render(request, 'casa_manage.html', {
        'casa': casa,
        'membros': membros,
        'usuarios_disponiveis': todos_usuarios,
        'add_form': add_form
    })

@login_required
@require_POST
def adicionar_usuario_casa(request, id):
    casa = get_object_or_404(Casa, id=id)
    if not (casa.dono == request.user or is_responsavel(request.user)):
        return JsonResponse({'erro': 'Sem permissão.'}, status=403)

    data = json.loads(request.body) if request.body else request.POST
    usuario_id = data.get('usuario_id') or request.POST.get('usuario_id')
    try:
        usuario = User.objects.get(id=int(usuario_id))
    except (User.DoesNotExist, ValueError, TypeError):
        return JsonResponse({'erro': 'Usuário inválido.'}, status=400)

    casa.membros.add(usuario)

    usuarios_group, _ = Group.objects.get_or_create(name='Usuarios')
    usuario.groups.add(usuarios_group)

    return JsonResponse({'mensagem': f'Usuário {usuario.username} adicionado à casa.'})

@login_required
@require_POST
def remover_usuario_casa(request, id, user_id):
    casa = get_object_or_404(Casa, id=id)
    if not (casa.dono == request.user or is_responsavel(request.user)):
        return JsonResponse({'erro': 'Sem permissão.'}, status=403)

    try:
        usuario = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'erro': 'Usuário não encontrado.'}, status=404)

    casa.membros.remove(usuario)

    return JsonResponse({'mensagem': f'Usuário {usuario.username} removido da casa.'})
